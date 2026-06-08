import { useMemo } from "react";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { submitDailyReportMail } from "@/services/report-journal.service";
import { useAuthStore } from "@/store/auth-store";
import type { Attendance, AttendanceImage } from "@/types/api";
import { fallbackToFullImage, getFullImageUrl, getImageDisplayUrl } from "@/utils/cloudinary-image";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
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

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
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

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.id || !payload) throw new Error("Thiếu dữ liệu review để gửi mail.");
      const gmailToken = await requestGmailSendToken();
      return submitDailyReportMail(currentUser.id, payload.workDate, gmailToken, payload.uploadedWordDocument);
    },
    onSuccess: () => {
      sessionStorage.removeItem(JOURNAL_REVIEW_STORAGE_KEY);
      navigate("/journal");
    },
  });

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
          <Button type="button" disabled={submitMutation.isPending} onClick={() => submitMutation.mutate()}>
            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Xác nhận gửi mail
          </Button>
        </div>
      </div>

      {submitMutation.error && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {submitMutation.error instanceof Error ? submitMutation.error.message : "Không thể gửi mail cuối ngày."}
        </p>
      )}

      <Card className="bg-white/95 shadow-sm ring-1 ring-slate-200">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Thông Tin Ca Làm</CardTitle>
              <CardDescription>Thông tin sinh viên, ngày, ca làm và khung giờ sẽ được dùng trong mail cuối ngày.</CardDescription>
            </div>
            <Badge tone="muted">
              {payload.uploadedWordDocument ? "Dùng file Word đã tải lên" : "Hệ thống sẽ đóng gói thành file Word"}
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
