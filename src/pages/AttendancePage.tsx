import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Camera, CheckCircle2, Clock3, Eye, ImageUp, Loader2, UploadCloud } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getShifts } from "@/services/shift.service";
import { addAttendanceImage, checkin, checkout, getAttendances, saveCheckoutDraft } from "@/services/attendance.service";
import { getUserSchedule } from "@/services/schedule.service";
import { uploadImage } from "@/services/upload.service";
import { getCohorts, getCohortStudents } from "@/services/cohort.service";
import { useAuthStore } from "@/store/auth-store";
import type { Attendance, AttendanceImagePhase, AttendanceImageType, Shift } from "@/types/api";
import { getGroupPhotoSlots, getPersonalIntervalSlots } from "@/utils/attendance-photo-rules";
import { formatDate } from "@/utils/date-format";
import { withCloudinaryTransform } from "@/utils/cloudinary-image";

// --- localStorage draft helpers ---
const DRAFT_KEY = "internflow-attendance-drafts";
function readDrafts(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}"); } catch { return {}; }
}
function writeDraft(k: string, url: string) {
  const all = readDrafts(); all[k] = url; localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
}
function removeDrafts(keys: string[]) {
  const all = readDrafts(); keys.forEach((k) => delete all[k]); localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
}

const PREVIEW_DB_NAME = "internflow-attendance-preview-drafts";
const PREVIEW_STORE_NAME = "previews";

function openPreviewDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(PREVIEW_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PREVIEW_STORE_NAME)) {
        db.createObjectStore(PREVIEW_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writePreviewDraft(key: string, file: File) {
  const db = await openPreviewDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(PREVIEW_STORE_NAME, "readwrite");
    transaction.objectStore(PREVIEW_STORE_NAME).put(file, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

async function readPreviewDrafts() {
  const db = await openPreviewDb();
  const result = await new Promise<Record<string, string>>((resolve, reject) => {
    const transaction = db.transaction(PREVIEW_STORE_NAME, "readonly");
    const request = transaction.objectStore(PREVIEW_STORE_NAME).getAllKeys();
    request.onsuccess = async () => {
      const keys = request.result as string[];
      const entries = await Promise.all(
        keys.map(
          (key) =>
            new Promise<[string, string] | null>((entryResolve) => {
              const getRequest = transaction.objectStore(PREVIEW_STORE_NAME).get(key);
              getRequest.onsuccess = () => {
                const file = getRequest.result as File | undefined;
                entryResolve(file ? [key, URL.createObjectURL(file)] : null);
              };
              getRequest.onerror = () => entryResolve(null);
            }),
        ),
      );
      resolve(Object.fromEntries(entries.filter((entry): entry is [string, string] => Boolean(entry))));
    };
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

async function removePreviewDrafts(keys: string[]) {
  const db = await openPreviewDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(PREVIEW_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PREVIEW_STORE_NAME);
    keys.forEach((key) => store.delete(key));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

type SlotKey = "checkin-personal" | "checkin-group" | "checkout-personal" | "checkout-group" | string;

function today() {
  return toDateInputValue(new Date());
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekRange(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  return {
    start: toDateInputValue(monday),
    end: toDateInputValue(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)),
  };
}

function fileKey(type: AttendanceImageType, phase: AttendanceImagePhase, time: string) {
  return `${type}-${phase}-${time}`;
}

function selectedAttendance(attendances: Attendance[] | undefined, shiftId: string | null) {
  return attendances?.find((attendance) => attendance.shift.id === shiftId);
}

function savedSlotImage(
  attendance: Attendance | undefined,
  imageType: AttendanceImageType,
  phase: AttendanceImagePhase,
  expectedTime: string,
) {
  const normalizedExpectedTime = expectedTime.slice(0, 5);
  return attendance?.images.find(
    (image) =>
      image.imageType === imageType &&
      image.phase === phase &&
      image.expectedTime.slice(0, 5) === normalizedExpectedTime,
  )?.imageUrl;
}

function ImagePicker({
  label,
  hint,
  file,
  imageUrl,
  cachedUrl,
  onChange,
}: {
  label: string;
  hint?: string;
  file?: File;
  imageUrl?: string;
  cachedUrl?: string;
  onChange: (file: File | undefined) => void;
}) {
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | undefined>();

  useEffect(() => {
    if (!file) {
      setFilePreviewUrl(undefined);
      return;
    }
    const nextPreviewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(nextPreviewUrl);
    return () => {
      URL.revokeObjectURL(nextPreviewUrl);
    };
  }, [file]);

  const previewUrl = filePreviewUrl ?? withCloudinaryTransform(imageUrl ?? cachedUrl, "c_limit,w_900,q_auto,f_auto");

  return (
    <label className="block overflow-hidden rounded-lg border border-dashed bg-slate-50 transition-colors hover:bg-slate-100">
      {previewUrl && (
        <div className="relative border-b bg-white">
          <img src={previewUrl} alt={label} className="aspect-video w-full object-cover" />
          <div className="absolute right-3 top-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-medium text-white">
            {file ? "Ảnh vừa chọn" : imageUrl ? "Đã lưu" : "Đã tải lên (chưa lưu)"}
          </div>
        </div>
      )}
      <div className="flex items-start gap-3 p-4">
        <div className="rounded-md bg-white p-2 text-slate-700 shadow-sm">
          <UploadCloud className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>}
          <p className="mt-2 truncate text-xs text-slate-600">{file ? file.name : "Chọn ảnh từ máy"}</p>
        </div>
      </div>
      <Input
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </label>
  );
}

function AdminAttendanceReviewPage() {
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const cohortsQuery = useQuery({ queryKey: ["cohorts"], queryFn: getCohorts });
  const studentsQuery = useQuery({
    queryKey: ["cohort-students", selectedCohortId],
    queryFn: () => getCohortStudents(selectedCohortId),
    enabled: Boolean(selectedCohortId),
  });

  if (cohortsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (cohortsQuery.error || !cohortsQuery.data) {
    return <ErrorState message="Không tải được danh sách khóa thực tập." />;
  }

  const students = studentsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Kiểm tra điểm danh</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin chỉ xem và kiểm tra minh chứng. Upload ảnh thuộc về sinh viên.
        </p>
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Chọn khóa cần kiểm tra</CardTitle>
          <CardDescription>Lọc sinh viên theo khóa thực tập để tránh lẫn dữ liệu giữa các đợt.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cohortsQuery.data.map((cohort) => (
            <button
              key={cohort.id}
              type="button"
              className={`rounded-lg border p-4 text-left transition ${selectedCohortId === cohort.id ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                }`}
              onClick={() => {
                setSelectedCohortId(cohort.id);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{cohort.name}</p>
                <Badge tone={cohort.active ? "success" : "muted"}>{cohort.active ? "Đang mở" : "Đã đóng"}</Badge>
              </div>
              <p className={selectedCohortId === cohort.id ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm text-muted-foreground"}>
                {cohort.code} · {formatDate(cohort.startDate)}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {selectedCohortId && (
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Sinh viên trong khóa</CardTitle>
            <CardDescription>Bấm chi tiết để xem từng buổi, ảnh đã nộp và cảnh báo thiếu minh chứng.</CardDescription>
          </CardHeader>
          <CardContent>
            {studentsQuery.isLoading ? (
              <div className="flex min-h-32 items-center justify-center">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {students.map((student) => (
                    <div key={student.id} className="rounded-lg border bg-slate-50 p-4">
                      <p className="truncate font-medium">{student.fullName}</p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">{student.email}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-md bg-white p-2">
                          <p className="text-xs text-muted-foreground">MSSV</p>
                          <p className="truncate font-medium">{student.studentCode || "Chưa có"}</p>
                        </div>
                        <div className="rounded-md bg-white p-2">
                          <p className="text-xs text-muted-foreground">Lớp</p>
                          <p className="truncate font-medium">{student.studentClass || "Chưa có"}</p>
                        </div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
                        <Link to={`/admin/students/${student.id}`}>
                          <Eye className="h-4 w-4" />
                          Chi tiết
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-3 font-medium">Họ tên</th>
                        <th className="py-3 font-medium">Email</th>
                        <th className="py-3 font-medium">MSSV</th>
                        <th className="py-3 font-medium">Lớp</th>
                        <th className="py-3 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-b last:border-0">
                          <td className="py-4 font-medium">{student.fullName}</td>
                          <td className="py-4 text-muted-foreground">{student.email}</td>
                          <td className="py-4">{student.studentCode || "Chưa có"}</td>
                          <td className="py-4">{student.studentClass || "Chưa có"}</td>
                          <td className="py-4">
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/admin/students/${student.id}`}>
                                <Eye className="h-4 w-4" />
                                Chi tiết
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function InternAttendancePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();
  const attendanceDate = searchParams.get("date") ?? today();
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<SlotKey, File | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [allDraftUrls, setAllDraftUrls] = useState<Record<string, string>>(readDrafts);
  const [allPreviewDraftUrls, setAllPreviewDraftUrls] = useState<Record<string, string>>({});
  const range = weekRange(attendanceDate);

  useEffect(() => {
    let mounted = true;
    void readPreviewDrafts().then((drafts) => {
      if (mounted) setAllPreviewDraftUrls(drafts);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const shiftsQuery = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const attendancesQuery = useQuery({
    queryKey: ["attendances", user?.id, attendanceDate],
    queryFn: () => getAttendances(user!.id, attendanceDate),
    enabled: Boolean(user?.id),
  });
  const registeredScheduleQuery = useQuery({
    queryKey: ["schedule", user?.id, attendanceDate, attendanceDate],
    queryFn: () => getUserSchedule(user!.id, attendanceDate, attendanceDate),
    enabled: Boolean(user?.id),
  });
  const weeklyScheduleQuery = useQuery({
    queryKey: ["schedule-week", user?.id, range.start, range.end],
    queryFn: () => getUserSchedule(user!.id, range.start, range.end),
    enabled: Boolean(user?.id),
  });

  const shifts = shiftsQuery.data ?? [];
  const registeredShiftIds = new Set(
    (registeredScheduleQuery.data ?? [])
      .filter((item) => item.status === "REGISTERED")
      .map((item) => item.shift.id),
  );
  const registeredShifts = shifts.filter((shift) => registeredShiftIds.has(shift.id));
  const weekRegisteredSchedules = (weeklyScheduleQuery.data ?? []).filter((item) => item.status === "REGISTERED");
  const selectedShift = useMemo(
    () => registeredShifts.find((shift) => shift.id === selectedShiftId) ?? registeredShifts[0],
    [selectedShiftId, registeredShifts],
  );
  const currentAttendance = selectedAttendance(attendancesQuery.data, selectedShift?.id ?? null);
  const personalSlots = selectedShift ? getPersonalIntervalSlots(selectedShift) : [];
  const groupSlots = selectedShift ? getGroupPhotoSlots(selectedShift) : [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedShift) throw new Error("Bạn cần đăng nhập và chọn ca.");
      if (!registeredShiftIds.has(selectedShift.id)) {
        throw new Error("Bạn cần đăng ký ca này trước khi điểm danh.");
      }
      const checkinPersonal = files["checkin-personal"];
      if (!checkinPersonal) throw new Error("Ảnh TimeMark vào ca là bắt buộc.");

      const timemarkUpload = await uploadImage(checkinPersonal);
      const groupFile = files["checkin-group"];
      const groupUpload = groupFile ? await uploadImage(groupFile) : undefined;

      return checkin({
        userId: user.id,
        shiftId: selectedShift.id,
        attendanceDate,
        timemarkImageUrl: timemarkUpload.url,
        groupImageUrl: groupUpload?.url,
      });
    },
    onSuccess: () => {
      setMessage("Checkin thành công.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể checkin.");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentAttendance) throw new Error("Bạn cần checkin ca này trước.");

      // Ưu tiên: file vừa chọn → đã lưu trong DB → draft từ localStorage (sau F5)
      const checkoutPersonalFile = files["checkout-personal"];
      const savedTimemarkUrl = currentAttendance.checkoutTimemarkImageUrl;
      const draftPersonalKey = `${user?.id ?? ""}|${attendanceDate}|${selectedShift?.id ?? ""}|checkout-personal`;
      const draftTimemarkUrl = allDraftUrls[draftPersonalKey];

      if (!checkoutPersonalFile && !savedTimemarkUrl && !draftTimemarkUrl) {
        throw new Error("Ảnh TimeMark tan ca là bắt buộc.");
      }
      const timemarkUrl = checkoutPersonalFile
        ? (await uploadImage(checkoutPersonalFile)).url
        : savedTimemarkUrl ?? draftTimemarkUrl!;

      const groupFile = files["checkout-group"];
      const savedGroupUrl = currentAttendance.checkoutGroupImageUrl;
      const draftGroupKey = `${user?.id ?? ""}|${attendanceDate}|${selectedShift?.id ?? ""}|checkout-group`;
      const draftGroupUrl = allDraftUrls[draftGroupKey];
      const groupUrl = groupFile
        ? (await uploadImage(groupFile)).url
        : savedGroupUrl ?? draftGroupUrl;

      return checkout(currentAttendance.id, {
        timemarkImageUrl: timemarkUrl,
        groupImageUrl: groupUrl,
      });
    },
    onSuccess: () => {
      setMessage("Checkout thành công.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
      // Xóa draft sau khi checkout thành công
      const keysToRemove = [
        `${user?.id ?? ""}|${attendanceDate}|${selectedShift?.id ?? ""}|checkout-personal`,
        `${user?.id ?? ""}|${attendanceDate}|${selectedShift?.id ?? ""}|checkout-group`,
      ];
      removeDrafts(keysToRemove);
      void removePreviewDrafts(keysToRemove);
      setAllDraftUrls((prev) => {
        const next = { ...prev };
        keysToRemove.forEach((k) => delete next[k]);
        return next;
      });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể checkout.");
    },
  });

  const uploadSlotMutation = useMutation({
    mutationFn: async ({
      key,
      imageType,
      phase,
      expectedTime,
      displayOrder,
    }: {
      key: SlotKey;
      imageType: AttendanceImageType;
      phase: AttendanceImagePhase;
      expectedTime: string;
      displayOrder: number;
    }) => {
      if (!currentAttendance) throw new Error("Bạn cần checkin trước khi nộp ảnh giữa giờ.");
      const file = files[key];
      if (!file) throw new Error("Chưa chọn ảnh.");
      const uploaded = await uploadImage(file);
      return addAttendanceImage(currentAttendance.id, {
        imageType,
        phase,
        expectedTime,
        imageUrl: uploaded.url,
        displayOrder,
      });
    },
    onSuccess: () => {
      setMessage("Đã lưu ảnh theo mốc thời gian.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể upload ảnh.");
    },
  });

  const saveCheckoutDraftMutation = useMutation({
    mutationFn: async ({ slotKey, file }: { slotKey: "checkout-personal" | "checkout-group"; file: File }) => {
      if (!currentAttendance) throw new Error("Bạn cần checkin trước khi lưu ảnh tan ca.");
      const uploaded = await uploadImage(file);
      return saveCheckoutDraft(currentAttendance.id, {
        timemarkImageUrl:
          slotKey === "checkout-personal"
            ? uploaded.url
            : currentAttendance.checkoutTimemarkImageUrl ?? "",
        groupImageUrl:
          slotKey === "checkout-group"
            ? uploaded.url
            : currentAttendance.checkoutGroupImageUrl,
      });
    },
    onSuccess: () => {
      setMessage("Đã lưu ảnh tan ca.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể lưu ảnh tan ca.");
    },
  });

  if (shiftsQuery.isLoading || attendancesQuery.isLoading || registeredScheduleQuery.isLoading || weeklyScheduleQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (shiftsQuery.error || !shiftsQuery.data) {
    return <ErrorState message="Không tải được danh sách ca từ backend." />;
  }

  const setFile = (key: SlotKey, file: File | undefined) => {
    setFiles((current) => ({ ...current, [key]: file }));
  };

  // composite key for localStorage
  const ck = (slotKey: SlotKey) => `${user?.id ?? ""}|${attendanceDate}|${selectedShift?.id ?? ""}|${slotKey}`;
  const getDraft = (slotKey: SlotKey) => allDraftUrls[ck(slotKey)];
  const getPreviewDraft = (slotKey: SlotKey) => allPreviewDraftUrls[ck(slotKey)];
  const persistDraftUrl = (slotKey: SlotKey, url: string) => {
    const key = ck(slotKey);
    writeDraft(key, url);
    setAllDraftUrls((prev) => ({ ...prev, [key]: url }));
  };

  // auto-upload on file select and persist URL to localStorage
  const handleFileChange = (slotKey: SlotKey, file: File | undefined) => {
    setFile(slotKey, file);
    if (!file) return;
    const previewKey = ck(slotKey);
    void writePreviewDraft(previewKey, file);
    setAllPreviewDraftUrls((prev) => ({ ...prev, [previewKey]: URL.createObjectURL(file) }));
    void uploadImage(file).then(({ url }) => {
      persistDraftUrl(slotKey, url);
    });
  };

  const handlePersistedSlotChange = (
    slotKey: SlotKey,
    file: File | undefined,
    imageType: AttendanceImageType,
    phase: AttendanceImagePhase,
    expectedTime: string,
    displayOrder: number,
  ) => {
    setFile(slotKey, file);
    if (!file) return;
    const previewKey = ck(slotKey);
    void writePreviewDraft(previewKey, file);
    setAllPreviewDraftUrls((prev) => ({ ...prev, [previewKey]: URL.createObjectURL(file) }));
    void (async () => {
      try {
        const { url } = await uploadImage(file);
        persistDraftUrl(slotKey, url);
        if (currentAttendance) {
          const savedImage = await addAttendanceImage(currentAttendance.id, {
            imageType,
            phase,
            expectedTime,
            imageUrl: url,
            displayOrder,
          });
          queryClient.setQueryData<Attendance[]>(["attendances", user?.id, attendanceDate], (current) =>
            current?.map((attendance) =>
              attendance.id === currentAttendance.id
                ? {
                    ...attendance,
                    images: [
                      ...attendance.images.filter(
                        (image) =>
                          !(
                            image.imageType === imageType &&
                            image.phase === phase &&
                            image.expectedTime.slice(0, 5) === expectedTime.slice(0, 5)
                          ),
                      ),
                      savedImage,
                    ],
                  }
                : attendance,
            ),
          );
        }
        setMessage(currentAttendance ? "?? t? ??ng l?u ?nh theo m?c th?i gian." : "?? l?u nh?p ?nh, F5 s? kh?ng m?t.");
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Kh?ng th? t? ??ng l?u ?nh.");
      }
    })();
  };

  const hasEnoughPersonalImagesForCheckout =
    Boolean(currentAttendance?.checkinTimemarkImageUrl) &&
    personalSlots.every((slot) =>
      Boolean(savedSlotImage(currentAttendance, "PERSONAL_TIMEMARK", "DURING_SHIFT", slot.time)),
    ) &&
    Boolean(files["checkout-personal"] || currentAttendance?.checkoutTimemarkImageUrl || getDraft("checkout-personal"));

  const isBusy =
    saveMutation.isPending ||
    checkoutMutation.isPending ||
    uploadSlotMutation.isPending ||
    saveCheckoutDraftMutation.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Điểm danh</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chọn ca, upload ảnh từ máy, hệ thống sẽ đẩy ảnh lên Cloudinary và lưu đúng mốc điểm danh.
        </p>
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle>Cơ chế nộp ảnh cho sinh viên mới</CardTitle>
          <CardDescription>Nên đọc kỹ trước khi điểm danh để tránh thiếu minh chứng cuối ca.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Clock3 className="h-4 w-4" />
              Ảnh vào ca và tan ca
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ảnh TimeMark đầu ca dùng để checkin, ảnh TimeMark cuối ca dùng để checkout.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <ImageUp className="h-4 w-4" />
              Ảnh cá nhân TimeMark
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Giữa ca cứ mỗi 30 phút upload 1 ảnh TimeMark. Mốc đầu ca và cuối ca không tính ở phần giữa giờ.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Camera className="h-4 w-4" />
              Ảnh nhóm
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ảnh nhóm có mốc vào ca, mỗi 1 tiếng giữa ca và tan ca. Nếu đi một mình có thể bỏ qua ảnh nhóm.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Chọn ca đã đăng ký</CardTitle>
          <CardDescription>Ngày điểm danh: {formatDate(attendanceDate)}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {shifts.map((shift) => (
            <button
              key={shift.id}
              type="button"
              disabled={!registeredShiftIds.has(shift.id)}
              className={`rounded-lg border p-4 text-left transition ${selectedShift?.id === shift.id ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                } ${!registeredShiftIds.has(shift.id) ? "cursor-not-allowed opacity-50" : ""}`}
              onClick={() => setSelectedShiftId(shift.id)}
            >
              <p className="font-semibold">{shift.name}</p>
              <p className={selectedShift?.id === shift.id ? "mt-1 text-sm text-slate-200" : "mt-1 text-sm text-muted-foreground"}>
                {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
              </p>
              <p className={selectedShift?.id === shift.id ? "mt-2 text-xs text-slate-200" : "mt-2 text-xs text-muted-foreground"}>
                {registeredShiftIds.has(shift.id) ? "Đã đăng ký" : "Chưa đăng ký"}
              </p>
            </button>
          ))}
          {registeredShifts.length === 0 && (
            <div className="col-span-full rounded-lg border border-dashed bg-slate-50 p-8 text-center">
              <p className="font-medium">Bạn chưa đăng ký ca nào cho ngày này</p>
              <p className="mt-2 text-sm text-muted-foreground">Nếu bạn đã đăng ký ca ở ngày khác, hãy bấm đúng ngày bên dưới để mở form điểm danh.</p>
              {weekRegisteredSchedules.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {weekRegisteredSchedules.map((item) => (
                    <Button key={item.id} asChild size="sm" variant="outline">
                      <Link to={`/attendance?date=${item.scheduleDate}`}>
                        {formatDate(item.scheduleDate)} - {item.shift.name}
                      </Link>
                    </Button>
                  ))}
                </div>
              )}
              <Button asChild className="mt-4">
                <Link to={`/schedule?date=${attendanceDate}`}>Đăng ký ca cho ngày này</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedShift && (
        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Form điểm danh {selectedShift.name}</CardTitle>
                <CardDescription>
                  {selectedShift.startTime.slice(0, 5)} - {selectedShift.endTime.slice(0, 5)}
                </CardDescription>
              </div>
              <Badge tone={currentAttendance?.status === "CHECKED_OUT" ? "success" : currentAttendance ? "warning" : "muted"}>
                {currentAttendance?.status === "CHECKED_OUT"
                  ? "Đã checkout"
                  : currentAttendance
                    ? "Đã checkin"
                    : "Chưa checkin"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(message || errorMessage) && (
              <div className={errorMessage ? "rounded-md bg-red-50 p-3 text-sm text-red-700" : "rounded-md bg-emerald-50 p-3 text-sm text-emerald-700"}>
                {errorMessage ?? message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <ImagePicker
                label="Ảnh TimeMark vào ca"
                hint="Bắt buộc để checkin."
                file={files["checkin-personal"]}
                imageUrl={currentAttendance?.checkinTimemarkImageUrl}
                cachedUrl={getDraft("checkin-personal") ?? getPreviewDraft("checkin-personal")}
                onChange={(file) => handleFileChange("checkin-personal", file)}
              />
              <ImagePicker
                label="Ảnh nhóm vào ca"
                hint="Không bắt buộc nếu hôm đó chỉ có một mình."
                file={files["checkin-group"]}
                imageUrl={currentAttendance?.checkinGroupImageUrl}
                cachedUrl={getDraft("checkin-group") ?? getPreviewDraft("checkin-group")}
                onChange={(file) => handleFileChange("checkin-group", file)}
              />
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={Boolean(currentAttendance) || isBusy}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Checkin
            </Button>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold">Ảnh TimeMark giữa giờ</h3>
                {personalSlots.map((slot, index) => {
                  const key = fileKey("PERSONAL_TIMEMARK", "DURING_SHIFT", slot.time);
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <ImagePicker
                        label={`Mốc ${slot.time}`}
                        file={files[key]}
                        imageUrl={savedSlotImage(currentAttendance, "PERSONAL_TIMEMARK", "DURING_SHIFT", slot.time)}
                        cachedUrl={getDraft(key) ?? getPreviewDraft(key)}
                        onChange={(file) =>
                          handlePersistedSlotChange(
                            key,
                            file,
                            "PERSONAL_TIMEMARK",
                            "DURING_SHIFT",
                            slot.time,
                            index,
                          )
                        }
                      />
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={!currentAttendance || uploadSlotMutation.isPending}
                        onClick={() =>
                          uploadSlotMutation.mutate({
                            key,
                            imageType: "PERSONAL_TIMEMARK",
                            phase: "DURING_SHIFT",
                            expectedTime: slot.time,
                            displayOrder: index,
                          })
                        }
                      >
                        Lưu ảnh mốc này
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Ảnh nhóm theo mốc</h3>
                {groupSlots.map((slot, index) => {
                  const phase: AttendanceImagePhase =
                    slot.time === selectedShift.startTime.slice(0, 5)
                      ? "CHECKIN"
                      : slot.time === selectedShift.endTime.slice(0, 5)
                        ? "CHECKOUT"
                        : "DURING_SHIFT";
                  const key = fileKey("GROUP", phase, slot.time);
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <ImagePicker
                        label={`${slot.label} - ${slot.time}`}
                        hint={phase === "CHECKIN" ? "Người đại diện giơ 2 ngón tay chào." : phase === "CHECKOUT" ? "Người đại diện giơ tay tạm biệt." : undefined}
                        file={files[key]}
                        imageUrl={savedSlotImage(currentAttendance, "GROUP", phase, slot.time)}
                        cachedUrl={getDraft(key) ?? getPreviewDraft(key)}
                        onChange={(file) => handlePersistedSlotChange(key, file, "GROUP", phase, slot.time, index)}
                      />
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={!currentAttendance || uploadSlotMutation.isPending}
                        onClick={() =>
                          uploadSlotMutation.mutate({
                            key,
                            imageType: "GROUP",
                            phase,
                            expectedTime: slot.time,
                            displayOrder: index,
                          })
                        }
                      >
                        Lưu ảnh nhóm
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ImagePicker
                label="Ảnh TimeMark tan ca"
                hint="Bắt buộc để checkout."
                file={files["checkout-personal"]}
                imageUrl={currentAttendance?.checkoutTimemarkImageUrl}
                cachedUrl={getDraft("checkout-personal") ?? getPreviewDraft("checkout-personal")}
                onChange={(file) => {
                  handleFileChange("checkout-personal", file);
                  if (file && currentAttendance) {
                    saveCheckoutDraftMutation.mutate({ slotKey: "checkout-personal", file });
                  }
                }}
              />
              <ImagePicker
                label="Ảnh nhóm tan ca"
                hint="Không bắt buộc nếu hôm đó chỉ có một mình."
                file={files["checkout-group"]}
                imageUrl={currentAttendance?.checkoutGroupImageUrl}
                cachedUrl={getDraft("checkout-group") ?? getPreviewDraft("checkout-group")}
                onChange={(file) => {
                  handleFileChange("checkout-group", file);
                  if (file && currentAttendance) {
                    saveCheckoutDraftMutation.mutate({ slotKey: "checkout-group", file });
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Button 
                onClick={() => checkoutMutation.mutate()} 
                disabled={!currentAttendance || currentAttendance.status === "CHECKED_OUT" || !hasEnoughPersonalImagesForCheckout || isBusy}
                className="w-full md:w-auto"
              >
                {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Checkout
              </Button>
              {!currentAttendance && (
                <p className="text-sm text-amber-600">
                  Bạn cần checkin trước khi có thể checkout
                </p>
              )}
              {currentAttendance?.status === "CHECKED_OUT" && (
                <p className="text-sm text-emerald-600">
                  Bạn đã checkout ca này rồi
                </p>
              )}
              {currentAttendance && currentAttendance.status !== "CHECKED_OUT" && !hasEnoughPersonalImagesForCheckout && (
                <p className="text-sm text-amber-600">
                  Cần đủ ảnh TimeMark giữa ca và ảnh TimeMark tan ca trước khi checkout
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AttendancePage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  return isAdmin ? <AdminAttendanceReviewPage /> : <InternAttendancePage />;
}
