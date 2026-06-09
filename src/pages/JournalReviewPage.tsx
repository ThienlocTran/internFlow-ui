import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { getDailyMailPreview } from "@/services/report-journal.service";
import { useAuthStore } from "@/store/auth-store";
import type { Attendance, AttendanceImage, DailyMailReadiness } from "@/types/api";
import { fallbackToFullImage, getFullImageUrl, getImageDisplayUrl } from "@/utils/cloudinary-image";

const JOURNAL_REVIEW_STORAGE_KEY = "journal_review_payload";

type UploadedWordDocument = {
  name: string;
  base64: string;
};

type ReviewPayload = {
  workDate: string;
  content: string;
  referenceLinks: string;
  sourceReferences?: string;
  attachmentName: string;
  storedWordFileName?: string;
  uploadedWordDocument?: UploadedWordDocument | null;
  shiftSummary: string;
  timeSummary: string;
  student: {
    fullName: string;
    studentCode: string;
    studentClass: string;
    school: string;
  };
  attendances: Attendance[];
};

function formatDisplayDate(workDate: string) {
  return new Date(`${workDate}T00:00:00`).toLocaleDateString("vi-VN");
}

function attendancePreviewImages(attendance: Attendance) {
  const items: Array<{ key: string; label: string; url: string; thumbnailUrl?: string }> = [];
  if (attendance.checkinTimemarkImageUrl) {
    items.push({ key: `${attendance.id}-checkin-personal`, label: "TimeMark đầu ca", url: attendance.checkinTimemarkImageUrl });
  }
  attendance.images.forEach((image: AttendanceImage) => {
    items.push({
      key: image.id,
      label:
        image.phase === "DURING_SHIFT"
          ? `${image.imageType === "GROUP" ? "Ảnh nhóm" : "TimeMark"} giữa ca ${image.expectedTime.slice(0, 5)}`
          : `${image.imageType === "GROUP" ? "Ảnh nhóm" : "TimeMark"} ${image.phase.toLowerCase()}`,
      url: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl,
    });
  });
  if (attendance.checkoutTimemarkImageUrl) {
    items.push({ key: `${attendance.id}-checkout-personal`, label: "TimeMark cuối ca", url: attendance.checkoutTimemarkImageUrl });
  }
  return items;
}


const DAILY_MAIL_TO = "tuyendungbpns@gmail.com";
const DAILY_MAIL_CC = "xuandat210425cty@gmail.com";
const GMAIL_COMPOSE_URL = "https://mail.google.com/mail/";

function imageInstructionLines(payload: ReviewPayload) {
  const lines = payload.attendances.flatMap((attendance) =>
    attendancePreviewImages(attendance).map((image) => `- ${attendance.shift.name}: ${image.url}`),
  );
  return lines.length > 0 ? lines : ["- Chưa có ảnh trong preview."];
}

function buildGmailComposeBody(payload: ReviewPayload, readiness: DailyMailReadiness) {
  const attachmentName = readiness.attachmentName ?? payload.attachmentName;
  const journalEntry = readiness.journalEntry;
  return [
    "Anh/ch\u1ecb vui l\u00f2ng nh\u1eadn nh\u1eadt k\u00fd th\u1ef1c t\u1eadp cu\u1ed1i ng\u00e0y.",
    "",
    `H\u1ecd t\u00ean: ${payload.student.fullName || "Ch\u01b0a c\u00f3"}`,
    `MSSV: ${payload.student.studentCode || "Ch\u01b0a c\u00f3"}`,
    `L\u1edbp/Tr\u01b0\u1eddng: ${payload.student.studentClass || "Ch\u01b0a c\u00f3"}${payload.student.school ? ` - ${payload.student.school}` : ""}`,
    `Ng\u00e0y: ${formatDisplayDate(payload.workDate)}`,
    `Ca l\u00e0m: ${readiness.shiftSummary || payload.shiftSummary}`,
    `Th\u1eddi gian: ${readiness.workTimeSummary || payload.timeSummary}`,
    journalEntry ? `B\u00e1o c\u00e1o ng\u00e0y: ${journalEntry.pageCount}/${journalEntry.requiredPages} trang \u01b0\u1edbc t\u00ednh` : "",
    "",
    `File Word c\u1ea7n \u0111\u00ednh k\u00e8m th\u1ee7 c\u00f4ng: ${attachmentName}`,
    "\u1ea2nh \u0111i\u1ec3m danh c\u1ea7n attach r\u1eddi t\u1eebng \u1ea3nh, kh\u00f4ng ZIP. Link tham chi\u1ebfu:",
    ...imageInstructionLines(payload),
    "",
    "T\u00e0i li\u1ec7u tham kh\u1ea3o:",
    payload.referenceLinks.trim() || "(Kh\u00f4ng c\u00f3)",
    "",
    "Ngu\u1ed3n tr\u00edch d\u1eabn:",
    payload.sourceReferences?.trim() || "(Kh\u00f4ng c\u00f3)",
    "",
    "L\u01b0u \u00fd: Gmail compose kh\u00f4ng t\u1ef1 attach file. Vui l\u00f2ng \u0111\u00ednh k\u00e8m file Word v\u00e0 c\u00e1c \u1ea3nh \u0111i\u1ec3m danh tr\u01b0\u1edbc khi b\u1ea5m g\u1eedi.",
  ].filter(Boolean).join("\n");
}

function buildGmailComposeUrl(payload: ReviewPayload, readiness: DailyMailReadiness) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: DAILY_MAIL_TO,
    cc: DAILY_MAIL_CC,
    su: readiness.subject,
    body: buildGmailComposeBody(payload, readiness),
  });
  return `${GMAIL_COMPOSE_URL}?${params.toString()}`;
}

export function JournalReviewPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const payload = useMemo<ReviewPayload | null>(() => {
    try {
      const raw = sessionStorage.getItem(JOURNAL_REVIEW_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ReviewPayload) : null;
    } catch {
      return null;
    }
  }, []);
  const [readiness, setReadiness] = useState<DailyMailReadiness | null>(null);
  const [isReadinessOpen, setIsReadinessOpen] = useState(false);
  const [composeUrl, setComposeUrl] = useState<string | null>(null);

  const readinessMutation = useMutation({
    mutationFn: async () => {
  if (!currentUser?.id || !payload) throw new Error("Thiếu dữ liệu review để kiểm tra mail.");
      return getDailyMailPreview(currentUser.id, payload.workDate);
    },
    onSuccess: (preview) => {
      setReadiness(preview);
      setIsReadinessOpen(true);
    },
  });

  const composeMutation = useMutation({
    mutationFn: async () => {
  if (!payload || !readiness?.ready) throw new Error("Còn thiếu dữ liệu chuẩn bị mail.");
      const url = buildGmailComposeUrl(payload, readiness);
      setComposeUrl(url);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
    throw new Error("Không mở được Gmail compose. Hãy cho phép popup hoặc bấm link mở thủ công.");
      }
      return url;
    },
  });

  const mailGateError = readinessMutation.error ?? composeMutation.error;

  if (!payload) {
    return (
      <div className="space-y-4">
        <ErrorState message="Không tìm thấy dữ liệu preview. Hãy quay lại trang nhật ký và bấm review lại." />
        <Button onClick={() => navigate("/journal")}>Quay lại nhật ký</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Review Mail Cuối Ngày</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Kiểm tra lại thông tin, ảnh đầy đủ của ca và file nhật ký trước khi gửi.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" className="bg-white" onClick={() => navigate("/journal")}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại nhật ký
          </Button>
          <Button type="button" disabled={readinessMutation.isPending || composeMutation.isPending} onClick={() => readinessMutation.mutate()}>
            {readinessMutation.isPending || composeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Kiểm tra gửi mail
          </Button>
        </div>
      </div>

      {mailGateError && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {mailGateError instanceof Error ? mailGateError.message : "Không thể chuẩn bị mail cuối ngày."}
        </p>
      )}
      {isReadinessOpen && readiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">Gate chuẩn bị mail</h2>
                <Badge tone={readiness.ready ? "success" : "warning"}>{readiness.ready ? "Đủ dữ liệu" : "Còn thiếu"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{readiness.subject}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Dong" onClick={() => setIsReadinessOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Ca</p>
                  <p className="mt-1 font-medium">{readiness.attendanceCount}/{readiness.scheduleCount}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">Anh</p>
                  <p className="mt-1 font-medium">{readiness.satisfiedPhotoCount}/{readiness.requiredPhotoCount}</p>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="text-xs text-muted-foreground">File Word</p>
                  <p className="mt-1 truncate font-medium">{readiness.attachmentName ?? payload.attachmentName}</p>
                </div>
              </div>

              {composeMutation.error && (
                <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {composeMutation.error instanceof Error ? composeMutation.error.message : "Không thể gửi mail cuối ngày."}
                </p>
              )}
              {composeUrl && (
                <a href={composeUrl} target="_blank" rel="noreferrer" className="block rounded-md bg-slate-50 p-3 text-sm font-medium text-slate-900 underline">
                  Mo Gmail compose thu cong
                </a>
              )}
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Gmail chỉ tự điền To/CC/subject/body. Hãy attach file Word và từng ảnh điểm danh trước khi bấm gửi.
              </p>

              <div className="space-y-3">
                {readiness.checks.map((check) => (
                  <div key={check.code} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {check.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                        <p className="font-medium">{check.label}</p>
                      </div>
              <Badge tone={check.ready ? "success" : "warning"}>{check.ready ? "OK" : "Thiếu"}</Badge>
                    </div>
                    {check.detail && <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>}
                    {check.missing.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-red-700">
                        {check.missing.map((item) => <li key={item}>- {item}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t p-5">
              <Button type="button" variant="outline" className="bg-white" onClick={() => setIsReadinessOpen(false)}>
                Dong
              </Button>
              <Button type="button" disabled={!readiness.ready || composeMutation.isPending} onClick={() => composeMutation.mutate()}>
                {composeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Mo Gmail de gui
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card className="bg-white/95 shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Thông Tin Ca Làm</CardTitle>
              <CardDescription>Thông tin sinh viên, ngày, ca làm và khung giờ sẽ được dùng trong mail cuối ngày.</CardDescription>
            </div>
            <Badge tone="muted">
              {payload.uploadedWordDocument || payload.storedWordFileName ? "Dung file Word da tai len" : "He thong se dong goi thanh file Word"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Họ tên</p>
            <p className="mt-2 font-medium">{payload.student.fullName || "Chưa có"}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">MSSV</p>
            <p className="mt-2 font-medium">{payload.student.studentCode || "Chưa có"}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Lớp / Trường</p>
            <p className="mt-2 font-medium">
              {payload.student.studentClass || "Chưa có"}
              {payload.student.school ? ` · ${payload.student.school}` : ""}
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Ngày</p>
            <p className="mt-2 font-medium">{formatDisplayDate(payload.workDate)}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Ca làm</p>
            <p className="mt-2 font-medium">{payload.shiftSummary}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Thời gian</p>
            <p className="mt-2 font-medium">{payload.timeSummary}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/95 shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <CardTitle>Ảnh Đầy Đủ Của Ca</CardTitle>
          <CardDescription>Ảnh được hiển thị trước phần file nhật ký như bạn yêu cầu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Tổng số ca trong ngày</p>
            <Badge tone="muted">{payload.attendances.length} ca</Badge>
          </div>
          {payload.attendances.length > 0 ? (
            payload.attendances.map((attendance) => {
              const previewImages = attendancePreviewImages(attendance);
              return (
                <div key={attendance.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{attendance.shift.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {attendance.shift.startTime.slice(0, 5)} - {attendance.shift.endTime.slice(0, 5)}
                      </p>
                    </div>
                    <Badge tone="muted">{attendance.status}</Badge>
                  </div>
                  {previewImages.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {previewImages.map((image) => {
                        const fullUrl = getFullImageUrl(image);
                        const displayUrl = getImageDisplayUrl(image);
                        if (!fullUrl || !displayUrl) return null;
                        return (
                        <a key={image.key} href={fullUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border bg-white">
                          <img
                            src={displayUrl}
                            alt={image.label}
                            loading="lazy"
                            onError={(event) => fallbackToFullImage(event, fullUrl)}
                            className="h-48 w-full object-cover"
                          />
                          <div className="p-3">
                            <p className="text-sm font-medium">{image.label}</p>
                          </div>
                        </a>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">Chưa có ảnh nào cho ca này.</p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              Chưa tải được dữ liệu ảnh điểm danh cho ngày này.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/95 shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <CardTitle>File Nhật Ký</CardTitle>
          <CardDescription>Phần file nhật ký được đặt sau toàn bộ ảnh như bạn yêu cầu.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Tên file sẽ gửi</p>
            <p className="mt-2 break-words font-medium">{payload.attachmentName}</p>
          </div>
          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm font-medium">Nội dung nhật ký</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {payload.content.trim() || "Chưa có nội dung"}
            </p>
          </div>
          {payload.referenceLinks.trim() && (
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-sm font-medium">Tài liệu tham khảo</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{payload.referenceLinks.trim()}</p>
            </div>
          )}
          {payload.sourceReferences?.trim() && (
            <div className="rounded-xl border bg-slate-50 p-4">
              <p className="text-sm font-medium">Nguon trich dan</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{payload.sourceReferences.trim()}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
