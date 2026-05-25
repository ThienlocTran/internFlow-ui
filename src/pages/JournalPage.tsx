import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  FileText,
  GitCommitVertical,
  Loader2,
  Mail,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import {
  getDailyReportEntries,
  getReportProgress,
  getReportRevisions,
  saveReportEntry,
  submitDailyReportMail,
} from "@/services/report-journal.service";
import { getUserSchedule } from "@/services/schedule.service";
import { getUsers } from "@/services/user.service";
import { useAuthStore } from "@/store/auth-store";
import type { DailyReportEntry, ReportEntry, User } from "@/types/api";
import { readDocx } from "@/utils/docx-reader";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/**
 * 210 words ≈ 1 Word page (based on empirical test: 2048 words → 8 pages in Word).
 * Used only for text pasted directly into the textarea. If the user uploads a .docx
 * file the actual page count from Word's metadata takes priority.
 */
const WORDS_PER_PAGE_ESTIMATE = 210;

// ─── localStorage helpers ──────────────────────────────────────────────────────
const STORAGE_KEY_PREFIX = "journal_draft";

function draftKey(userId: string, workDate: string) {
  return `${STORAGE_KEY_PREFIX}:${userId}:${workDate}`;
}

function saveDraft(userId: string, workDate: string, content: string, referenceLinks: string) {
  try {
    localStorage.setItem(draftKey(userId, workDate), JSON.stringify({ content, referenceLinks }));
  } catch {
    // quota exceeded — ignore
  }
}

function loadDraft(userId: string, workDate: string): { content: string; referenceLinks: string } | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, workDate));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearDraft(userId: string, workDate: string) {
  try {
    localStorage.removeItem(draftKey(userId, workDate));
  } catch {
    // ignore
  }
}

// ─── Pure helpers ──────────────────────────────────────────────────────────────
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function statusLabel(entry: ReportEntry) {
  if (entry.enoughPages) return "Đủ trang";
  return `Thiếu ${Math.max(0, entry.requiredPages - entry.pageCount)} trang`;
}

function countWords(value: string) {
  const text = value.trim();
  return text ? text.split(/\s+/).length : 0;
}

function estimatePageCount(value: string) {
  const words = countWords(value);
  return words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_PAGE_ESTIMATE));
}

function inferRequiredPagesFromSchedules(schedules: { status: string; shift: { code: string } }[] | undefined) {
  const registered = (schedules ?? []).filter((item) => item.status === "REGISTERED");
  if (registered.length === 0) return 0;
  return registered.some((item) => item.shift.code === "SHIFT_1" || item.shift.code === "SHIFT_2") ? 8 : 5;
}

function canUseStudentEditor(role: User["role"] | undefined) {
  return role === "INTERN" || role === "TEAM_LEADER";
}

function initials(user: User | undefined | null) {
  const source = user?.fullName || user?.email || "IF";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function buildMailSubject(user: User | null | undefined, completedShiftCount: number, workDate: string) {
  const date = new Date(`${workDate}T00:00:00`);
  const displayDate = `${date.getDate()}.${date.getMonth() + 1}.${String(date.getFullYear()).slice(2)}`;
  return `${user?.fullName ?? "Sinh viên"}, được ${completedShiftCount} ca, ngày ${displayDate}`;
}

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return; }
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Không tải được Google OAuth.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Không tải được Google OAuth."));
    document.head.appendChild(script);
  });
}

async function requestGmailSendToken() {
  if (!GOOGLE_CLIENT_ID) throw new Error("Chưa cấu hình VITE_GOOGLE_CLIENT_ID.");
  await loadGoogleScript();
  return new Promise<string>((resolve, reject) => {
    const tokenClient = (window as any).google?.accounts.oauth2?.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/gmail.send openid email profile",
      prompt: "consent",
      callback: (response: { access_token?: string; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error("Bạn cần cấp quyền Gmail để gửi mail bằng chính tài khoản của mình."));
          return;
        }
        resolve(response.access_token);
      },
    });
    tokenClient?.requestAccessToken();
  });
}

// ─── Word upload status ────────────────────────────────────────────────────────
type WordUploadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; fileName: string; pageCount: number | null; wordCount: number }
  | { status: "error"; message: string };

// ─── Main component ────────────────────────────────────────────────────────────
export function JournalPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const isAdmin = currentUser?.role === "ADMIN" || currentUser?.role === "MANAGER";
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id ?? "");
  const [workDate, setWorkDate] = useState(today());
  const [selectedDailyEntry, setSelectedDailyEntry] = useState<DailyReportEntry | null>(null);
  const [content, setContent] = useState("");
  const [referenceLinks, setReferenceLinks] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [wordUpload, setWordUpload] = useState<WordUploadState>({ status: "idle" });
  // When a Word file is uploaded and contains page metadata, use that count;
  // otherwise fall back to text-based estimation.
  const [wordFilePage, setWordFilePage] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const dailyEntriesQuery = useQuery({
    queryKey: ["report-journals-daily", workDate],
    queryFn: () => getDailyReportEntries(workDate),
    enabled: isAdmin,
  });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: false,
  });
  const targetUserId = isAdmin ? selectedDailyEntry?.document.user.id : currentUser?.id;
  const progressQuery = useQuery({
    queryKey: ["report-progress", targetUserId],
    queryFn: () => getReportProgress(targetUserId!),
    enabled: Boolean(targetUserId),
  });
  const dayScheduleQuery = useQuery({
    queryKey: ["journal-day-schedule", currentUser?.id, workDate],
    queryFn: () => getUserSchedule(currentUser!.id, workDate, workDate),
    enabled: canUseStudentEditor(currentUser?.role) && Boolean(currentUser?.id) && Boolean(workDate),
  });
  const revisionsQuery = useQuery({
    queryKey: ["report-revisions", selectedEntryId],
    queryFn: () => getReportRevisions(selectedEntryId!),
    enabled: Boolean(selectedEntryId),
  });

  const targetUser = useMemo(() => {
    if (!isAdmin) return currentUser;
    return selectedDailyEntry?.document.user;
  }, [currentUser, isAdmin, selectedDailyEntry]);

  const currentEntry = progressQuery.data?.entries.find((entry) => entry.workDate === workDate);
  const draftWordCount = countWords(content);
  // Page count: prefer Word file metadata, else estimate from text
  const draftPageCount = wordFilePage !== null ? wordFilePage : estimatePageCount(content);
  const requiredPages = currentEntry?.requiredPages ?? inferRequiredPagesFromSchedules(dayScheduleQuery.data);
  const remainingPages = Math.max(0, requiredPages - draftPageCount);
  const pageProgress = requiredPages > 0 ? Math.min(100, Math.round((draftPageCount / requiredPages) * 100)) : 0;
  const requiredWords = requiredPages * WORDS_PER_PAGE_ESTIMATE;
  const pageMarks = Array.from({ length: Math.max(requiredPages, draftPageCount, 1) }, (_, index) => index + 1);

  // ── localStorage persistence ─────────────────────────────────────────────────
  const canEdit = !isAdmin && Boolean(currentUser?.id);

  // ── Mutations — declared here so they can be referenced in useEffect below ──

  const saveMutation = useMutation({
    mutationFn: () =>
      saveReportEntry({
        userId: currentUser!.id,
        workDate,
        content,
        referenceLinks,
      }),
    onSuccess: (entry) => {
      setNotice(
        entry.enoughPages
          ? "Đã lưu nhật ký. Entry này đủ điều kiện đưa vào mail cuối ngày."
          : "Đã lưu nhật ký, nhưng vẫn chưa đủ số trang yêu cầu.",
      );
      queryClient.invalidateQueries({ queryKey: ["report-progress", currentUser?.id] });
      setSelectedEntryId(entry.id);
      // Clear localStorage draft after successful server save
      if (currentUser?.id) clearDraft(currentUser.id, workDate);
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Không thể lưu nhật ký.");
    },
  });

  const submitMailMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id) throw new Error("Bạn cần đăng nhập trước khi gửi mail cuối ngày.");
      if (requiredPages <= 0) throw new Error("Ngày này chưa có ca đăng ký nên chưa thể gửi mail cuối ngày.");
      if (!content.trim()) throw new Error("Bạn cần viết nhật ký trước khi gửi mail cuối ngày.");
      if (draftPageCount < requiredPages) {
        throw new Error(`Nhật ký hôm nay mới đạt ${draftPageCount}/${requiredPages} trang. Hãy viết đủ trang rồi gửi lại.`);
      }
      const normalizedContent = content.trim();
      const normalizedReferenceLinks = referenceLinks.trim();
      const needsSave =
        !currentEntry ||
        (currentEntry.content ?? "").trim() !== normalizedContent ||
        (currentEntry.referenceLinks ?? "").trim() !== normalizedReferenceLinks ||
        currentEntry.pageCount !== draftPageCount;

      const gmailToken = await requestGmailSendToken();
      let entryForMail = currentEntry;
      if (needsSave) {
        setNotice("Đang lưu bản nhật ký mới nhất trước khi gửi mail...");
        entryForMail = await saveReportEntry({
          userId: currentUser.id,
          workDate,
          content,
          referenceLinks,
        });
        setSelectedEntryId(entryForMail.id);
        queryClient.invalidateQueries({ queryKey: ["report-progress", currentUser.id] });
        if (currentUser?.id) clearDraft(currentUser.id, workDate);
      }
      if (!entryForMail?.enoughPages) throw new Error("Nhật ký hôm nay chưa đủ số trang yêu cầu.");
      return submitDailyReportMail(currentUser.id, workDate, gmailToken);
    },
    onSuccess: (result) => {
      setNotice(`Đã gửi mail tới ${result.to}, CC ${result.cc}. File đính kèm: ${result.attachmentName}`);
      queryClient.invalidateQueries({ queryKey: ["report-progress", currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ["report-journals-daily", workDate] });
    },
    onError: (error) => {
      setNotice(error instanceof Error ? error.message : "Không thể gửi mail cuối ngày.");
    },
  });

  // ── Word file upload handler ─────────────────────────────────────────────────
  const handleWordFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setWordUpload({ status: "error", message: "Chỉ hỗ trợ định dạng .docx. Vui lòng lưu file Word dưới dạng .docx rồi thử lại." });
      return;
    }
    setWordUpload({ status: "loading" });
    try {
      const info = await readDocx(file);
      setWordUpload({
        status: "done",
        fileName: file.name,
        pageCount: info.pageCount,
        wordCount: info.wordCount,
      });
      // Populate textarea with extracted text (if any)
      if (info.text) setContent(info.text);
      // Use Word's page count metadata if available; else estimate from extracted text
      if (info.pageCount !== null) {
        setWordFilePage(info.pageCount);
      } else {
        // Fall back to word-count estimate from extracted text
        setWordFilePage(null);
      }
    } catch (err) {
      setWordUpload({
        status: "error",
        message: err instanceof Error ? err.message : "Không đọc được file Word.",
      });
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleWordFile(file);
    // Reset input value so same file can be selected again
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleWordFile(file);
  };

  const clearWordFile = () => {
    setWordUpload({ status: "idle" });
    setWordFilePage(null);
    setContent("");
  };

  // ── Entry navigation helpers ─────────────────────────────────────────────────
  const loadEntry = (entry: ReportEntry) => {
    setWorkDate(entry.workDate);
    setContent(entry.content ?? "");
    setReferenceLinks(entry.referenceLinks ?? "");
    setSelectedEntryId(entry.id);
    setWordFilePage(null);
    setWordUpload({ status: "idle" });
    setNotice(null);
  };

  const openDailyEntry = (item: DailyReportEntry) => {
    setSelectedDailyEntry(item);
    setSelectedUserId(item.document.user.id);
    setContent(item.entry.content ?? "");
    setReferenceLinks(item.entry.referenceLinks ?? "");
    setSelectedEntryId(item.entry.id);
    setWordFilePage(null);
    setWordUpload({ status: "idle" });
    setNotice(null);
  };

  const entries = progressQuery.data?.entries ?? [];

  // ── localStorage draft persistence ──────────────────────────────────────────
  // Load draft when workDate changes (for student editor only)
  useEffect(() => {
    if (!canEdit || !currentUser?.id) return;
    
    // If there's already a saved entry for this date, use that instead of draft
    if (currentEntry) {
      setContent(currentEntry.content ?? "");
      setReferenceLinks(currentEntry.referenceLinks ?? "");
      return;
    }

    // Otherwise load draft from localStorage
    const draft = loadDraft(currentUser.id, workDate);
    if (draft) {
      setContent(draft.content);
      setReferenceLinks(draft.referenceLinks);
    } else {
      setContent("");
      setReferenceLinks("");
    }
    setWordFilePage(null);
    setWordUpload({ status: "idle" });
  }, [workDate, currentUser?.id, canEdit, currentEntry]);

  // Auto-save draft to localStorage when content/referenceLinks change
  useEffect(() => {
    if (!canEdit || !currentUser?.id) return;
    
    // Debounce: save after 1 second of no typing
    const timeoutId = setTimeout(() => {
      if (content || referenceLinks) {
        saveDraft(currentUser.id, workDate, content, referenceLinks);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content, referenceLinks, workDate, currentUser?.id, canEdit]);

  if (!currentUser) return <ErrorState message="Bạn cần đăng nhập để xem nhật ký thực tập." />;

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Nhật ký thực tập</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sinh viên viết tiếp mỗi ngày, hệ thống tự gom thành một nhật ký lớn và lưu lịch sử chỉnh sửa theo ngày.
          </p>
        </div>
        <div className={isAdmin ? "hidden" : "rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground"}>
          Gửi mail cuối ngày tới <span className="font-medium text-foreground">tuyendungbpns@gmail.com</span>, CC{" "}
          <span className="font-medium text-foreground">xuandat210425cty@gmail.com</span>
        </div>
      </div>

      {/* Admin daily overview ─────────────────────────────────────────────── */}
      {isAdmin && (
        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
              <div>
                <CardTitle>Nhật ký trong ngày</CardTitle>
                <CardDescription>Chọn ngày để xem tất cả bài nhật ký của sinh viên và nhóm trưởng.</CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
                  value={workDate}
                  onChange={(event) => {
                    setWorkDate(event.target.value);
                    setSelectedDailyEntry(null);
                    setSelectedUserId("");
                    setSelectedEntryId(null);
                  }}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyEntriesQuery.isLoading && (
              <div className="flex min-h-32 items-center justify-center">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            )}
            {!dailyEntriesQuery.isLoading && (dailyEntriesQuery.data ?? []).length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <BookOpenText className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">Chưa có nhật ký trong ngày này</p>
                <p className="mt-1 text-sm text-muted-foreground">Khi sinh viên hoặc nhóm trưởng lưu bài, danh sách sẽ hiện tại đây.</p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(dailyEntriesQuery.data ?? []).map((item) => {
                const selected = selectedDailyEntry?.entry.id === item.entry.id;
                const user = item.document.user;
                return (
                  <button
                    key={item.entry.id}
                    type="button"
                    className={`rounded-xl border p-4 text-left transition ${
                      selected ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                    }`}
                    onClick={() => openDailyEntry(item)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-semibold ${
                        selected ? "bg-white text-slate-950" : "bg-slate-950 text-white"
                      }`}>
                        {initials(user)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{user.fullName}</p>
                            <p className={selected ? "mt-1 truncate text-xs text-slate-200" : "mt-1 truncate text-xs text-muted-foreground"}>
                              {user.email}
                            </p>
                          </div>
                          <Badge tone={user.role === "TEAM_LEADER" ? "warning" : "muted"}>{user.role}</Badge>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge tone={item.entry.enoughPages ? "success" : "warning"}>
                            {item.entry.pageCount}/{item.entry.requiredPages} trang
                          </Badge>
                          <Badge tone="muted">{item.entry.shiftCodes || "Chưa có ca"}</Badge>
                        </div>
                        <p className={selected ? "mt-3 line-clamp-3 text-sm leading-6 text-slate-200" : "mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground"}>
                          {item.entry.content || "Chưa có nội dung"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden admin user-picker */}
      {isAdmin && (
        <Card className="hidden">
          <CardHeader>
            <CardTitle>Chọn sinh viên để xem tiến độ</CardTitle>
            <CardDescription>Admin xem theo từng ngày, không cần kéo file Word dài 150-200 trang.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-[320px_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <select
                className="h-10 w-full rounded-md border bg-white pl-9 pr-3 text-sm"
                value={selectedUserId}
                onChange={(event) => {
                  setSelectedUserId(event.target.value);
                  setSelectedEntryId(null);
                }}
              >
                <option value="">Chọn sinh viên</option>
                {(usersQuery.data ?? []).filter((user) => user.role === "INTERN").map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.studentCode ?? "Chưa có MSSV"} - {user.fullName}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {progressQuery.isLoading && (
        <div className="flex min-h-[40vh] items-center justify-center"><LoadingSpinner className="h-8 w-8" /></div>
      )}
      {progressQuery.error && <ErrorState message="Không tải được nhật ký từ backend." />}

      {progressQuery.data && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-6">
            {/* Document summary card ──────────────────────────────────── */}
            <Card className="bg-white/90">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{progressQuery.data.document.currentFileName}</CardTitle>
                    <CardDescription>
                      Tổng {progressQuery.data.document.totalPages} trang ước tính · {progressQuery.data.document.completedShiftCount} ca đã checkout
                    </CardDescription>
                  </div>
                  <Badge tone="muted">{targetUser?.studentCode ?? targetUser?.email}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">Tiêu đề mail hôm nay</p>
                  <p className="mt-2 font-medium">{buildMailSubject(targetUser, progressQuery.data.document.completedShiftCount, workDate)}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">Quy định trang</p>
                  <p className="mt-2 font-medium">Ca ngày 8 trang · Ca tối 5 trang</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">Trạng thái ngày chọn</p>
                  <p className="mt-2 font-medium">{currentEntry ? statusLabel(currentEntry) : "Chưa có nhật ký"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Student editor ────────────────────────────────────────── */}
            {canEdit && (
              <Card className="bg-white/90">
                <CardHeader>
                  <CardTitle>Viết nhật ký theo ngày</CardTitle>
                  <CardDescription>
                    Chỉ viết cho ngày đã đăng ký ca. Nội dung được tự động lưu nháp trên trình duyệt — không mất khi tải lại trang.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Input type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)} />

                  {/* Page progress ───────────────────────────────────── */}
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Tiến độ trang hôm nay</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {wordFilePage !== null
                            ? `File Word: ${wordFilePage} trang thực · ${draftWordCount} từ (ước tính)`
                            : `${draftWordCount} từ · ước tính ${draftPageCount}/${requiredPages || "?"} trang`}
                        </p>
                      </div>
                      <Badge tone={requiredPages > 0 && remainingPages === 0 ? "success" : "warning"}>
                        {requiredPages === 0
                          ? "Chưa có ca đăng ký"
                          : remainingPages === 0
                          ? "Đủ trang"
                          : `Thiếu ${remainingPages} trang`}
                      </Badge>
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-white">
                      <div className="h-full rounded-full bg-slate-950 transition-all" style={{ width: `${pageProgress}%` }} />
                    </div>
                    {requiredPages > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pageMarks.map((page) => (
                          <span
                            key={page}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              page <= draftPageCount ? "bg-slate-950 text-white" : "bg-white text-muted-foreground"
                            }`}
                          >
                            Trang {page}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Word file upload zone ───────────────────────────── */}
                  <div>
                    <p className="mb-2 text-sm font-medium">Tải lên file Word (.docx)</p>
                    <div
                      className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-slate-400 hover:bg-white"
                      onDrop={handleDrop}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={handleFileInputChange}
                      />

                      {wordUpload.status === "idle" && (
                        <div className="flex flex-col items-center gap-2 py-8 text-center">
                          <Upload className="h-8 w-8 text-slate-400" />
                          <p className="text-sm font-medium text-slate-700">Kéo thả file Word vào đây hoặc click để chọn</p>
                          <p className="text-xs text-muted-foreground">
                            Hệ thống sẽ đọc số trang thực từ file Word và tự điền nội dung vào ô bên dưới.
                          </p>
                        </div>
                      )}

                      {wordUpload.status === "loading" && (
                        <div className="flex items-center justify-center gap-3 py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                          <span className="text-sm text-slate-600">Đang đọc file Word…</span>
                        </div>
                      )}

                      {wordUpload.status === "done" && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{wordUpload.fileName}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {wordUpload.pageCount !== null
                                  ? `${wordUpload.pageCount} trang (từ metadata Word) · ${wordUpload.wordCount} từ`
                                  : `${wordUpload.wordCount} từ · ước tính ${estimatePageCount(content)} trang`}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            onClick={(e) => { e.stopPropagation(); clearWordFile(); }}
                            title="Xóa file"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {wordUpload.status === "error" && (
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                          <p className="text-sm text-red-600">{wordUpload.message}</p>
                          <button
                            type="button"
                            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                            onClick={(e) => { e.stopPropagation(); setWordUpload({ status: "idle" }); }}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Text editor ─────────────────────────────────────── */}
                  <div className="overflow-hidden rounded-xl border bg-slate-100 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3">
                      <div>
                        <p className="text-sm font-semibold">Bản thảo nhật ký</p>
                        <p className="text-xs text-muted-foreground">
                          {wordFilePage !== null
                            ? "Nội dung được tải từ file Word. Bạn có thể chỉnh sửa bên dưới."
                            : `Mỗi ${WORDS_PER_PAGE_ESTIMATE} từ được tính gần đúng là 1 trang Word.`}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{draftWordCount}/{requiredWords || "?"} từ mục tiêu</span>
                        <span>
                          {wordFilePage !== null ? `${wordFilePage} trang (Word)` : `${draftPageCount} trang ước tính`}
                        </span>
                      </div>
                    </div>
                    <textarea
                      className="min-h-[680px] w-full resize-y bg-white px-8 py-7 text-[15px] leading-8 outline-none focus:bg-white lg:px-12"
                      placeholder="Viết nội dung báo cáo hôm nay tại đây..."
                      value={content}
                      onChange={(event) => {
                        setContent(event.target.value);
                        // If user edits manually after Word upload, switch back to estimate
                        if (wordFilePage !== null) setWordFilePage(null);
                      }}
                    />
                  </div>

                  <textarea
                    className="min-h-28 w-full rounded-lg border bg-white p-4 text-sm leading-6 outline-none focus:border-slate-400"
                    placeholder="Tài liệu tham khảo, link, sách, bài báo cáo cũ..."
                    value={referenceLinks}
                    onChange={(event) => setReferenceLinks(event.target.value)}
                  />

                  {/* Draft persistence notice */}
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Bản nháp tự động lưu vào trình duyệt — không mất dữ liệu khi F5 hoặc đóng tab.
                  </p>

                  {notice && <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">{notice}</p>}

                  <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Lưu nhật ký hôm nay
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-0 bg-white md:ml-2"
                    disabled={submitMailMutation.isPending || saveMutation.isPending || dayScheduleQuery.isLoading}
                    onClick={() => submitMailMutation.mutate()}
                  >
                    {submitMailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Gửi mail cuối ngày
                  </Button>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Nút này sẽ tự lưu bản hiện tại, kiểm tra đủ trang rồi mới xin quyền Gmail để gửi bằng chính tài khoản của bạn.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar ──────────────────────────────────────────── */}
          <div className="space-y-6">
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle>Timeline bài viết</CardTitle>
                <CardDescription>Bấm từng ngày để xem nội dung và lịch sử sửa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {entries.length > 0 ? entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="w-full rounded-lg border bg-white p-4 text-left transition hover:bg-slate-50"
                    onClick={() => loadEntry(entry)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{entry.workDate}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{entry.shiftCodes || "Chưa nhận diện ca"}</p>
                      </div>
                      <Badge tone={entry.enoughPages ? "success" : "warning"}>{statusLabel(entry)}</Badge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{entry.content || "Chưa có nội dung"}</p>
                  </button>
                )) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <BookOpenText className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 font-medium">Chưa có nhật ký</p>
                    <p className="mt-1 text-sm text-muted-foreground">Sinh viên lưu bài đầu tiên thì timeline sẽ hiện ở đây.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedEntryId && (
              <Card className="bg-white/90">
                <CardHeader>
                  <CardTitle>Lịch sử chỉnh sửa</CardTitle>
                  <CardDescription>Xem nhanh hôm nay sinh viên đã thêm/sửa gì.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {revisionsQuery.isLoading && <LoadingSpinner className="h-6 w-6" />}
                  {(revisionsQuery.data ?? []).map((revision) => (
                    <div key={revision.id} className="rounded-lg border bg-white p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <GitCommitVertical className="h-4 w-4" />
                        {revision.diffSummary}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{new Date(revision.createdAt).toLocaleString("vi-VN")}</p>
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{revision.newContent}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className={isAdmin ? "hidden" : "bg-slate-950 text-white rounded-2xl"}>
              <CardContent className="flex min-h-[170px] flex-col justify-center px-6 py-9">

                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Mail className="h-5 w-5" />
                  <span>Mail cuối ngày</span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Nút gửi mail sẽ tạo file Word nhật ký, đính kèm vào mail
                  và gửi tới bộ phận tuyển dụng theo cấu hình hệ thống.
                </p>

              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
