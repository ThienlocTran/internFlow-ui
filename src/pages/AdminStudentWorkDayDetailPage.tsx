import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BookOpenText, Image as ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getAdminStudentDetail } from "@/services/cohort.service";
import type { AttendanceAudit, AttendanceImage } from "@/types/api";
import { fallbackToFullImage, getFullImageUrl, getImageDisplayUrl } from "@/utils/cloudinary-image";
import { formatDate } from "@/utils/date-format";

function imageItems(attendance: AttendanceAudit) {
  const legacy = [
    { id: "checkin-personal", label: "TimeMark vào ca", url: attendance.checkinTimemarkImageUrl },
    { id: "checkin-group", label: "Ảnh nhóm vào ca", url: attendance.checkinGroupImageUrl },
    { id: "checkout-personal", label: "TimeMark tan ca", url: attendance.checkoutTimemarkImageUrl },
    { id: "checkout-group", label: "Ảnh nhóm tan ca", url: attendance.checkoutGroupImageUrl },
  ].filter((item): item is { id: string; label: string; url: string } => Boolean(item.url));
  const extra = attendance.images.map((image: AttendanceImage) => ({
    id: image.id,
    label: `${image.imageType} · ${image.phase} · ${image.expectedTime}`,
    url: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
  }));
  return [...legacy, ...extra];
}

function missingEvidenceText(day: { missingPersonalImages: number; missingGroupImages: number; missingReportPages: number }) {
  const missingImages: string[] = [];
  if (day.missingPersonalImages > 0) missingImages.push(`${day.missingPersonalImages} ảnh cá nhân`);
  if (day.missingGroupImages > 0) missingImages.push(`${day.missingGroupImages} ảnh nhóm`);

  if (missingImages.length === 0 && day.missingReportPages > 0) {
    return `Ảnh đã đủ, chỉ thiếu file báo cáo (${day.missingReportPages} trang).`;
  }

  const parts = [...missingImages];
  if (day.missingReportPages > 0) parts.push(`${day.missingReportPages} trang báo cáo`);
  return `Thiếu ${parts.join(", ")}.`;
}

export function AdminStudentWorkDayDetailPage() {
  const { studentId, workDate } = useParams();
  const detailQuery = useQuery({
    queryKey: ["admin-student-detail", studentId],
    queryFn: () => getAdminStudentDetail(studentId!),
    enabled: Boolean(studentId),
  });

  if (!studentId || !workDate) return <ErrorState message="Thiếu thông tin ngày thực tập cần xem." />;

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return <ErrorState message="Không tải được chi tiết ngày thực tập từ backend." />;
  }

  const day = detailQuery.data.workDays.find((item) => item.workDate === workDate);
  if (!day) return <ErrorState message="Không tìm thấy ngày thực tập này." />;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4 bg-white">
          <Link to={`/admin/students/${studentId}`}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách ngày
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-normal">Chi tiết ngày {formatDate(day.workDate)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Ảnh điểm danh và nhật ký thực tập của ngày này.</p>
      </div>

      <Card className="bg-white/90">
        <CardContent className="p-5">
          <div className="rounded-xl border bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{formatDate(day.workDate)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {day.attendances.length} ca · báo cáo {day.submittedReportPages}/{day.requiredReportPages} trang
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone={day.enoughImages ? "success" : "warning"}>{day.enoughImages ? "Đủ ảnh" : "Thiếu ảnh"}</Badge>
                <Badge tone={day.enoughReportPages ? "success" : "warning"}>{day.enoughReportPages ? "Đủ báo cáo" : "Thiếu file báo cáo"}</Badge>
              </div>
            </div>

            {(!day.enoughImages || !day.enoughReportPages) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <span>{missingEvidenceText(day)}</span>
              </div>
            )}

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_480px] 2xl:grid-cols-[minmax(0,1fr)_540px]">
              <div className="space-y-3">
                {day.attendances.map((attendance) => {
                  const images = imageItems(attendance);
                  return (
                    <div key={attendance.attendanceId} className="rounded-lg border bg-slate-50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{attendance.shiftName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Cá nhân {attendance.uploadedPersonalImages}/{attendance.requiredPersonalImages} · Nhóm {attendance.uploadedGroupImages}/{attendance.requiredGroupImages}
                          </p>
                        </div>
                        <Badge tone={attendance.enoughImages ? "success" : "warning"}>{attendance.enoughImages ? "Đủ minh chứng" : "Còn thiếu"}</Badge>
                      </div>
                      {!attendance.enoughImages && (
                        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                          {attendance.missingPersonalSlots.length > 0 && <p>Thiếu TimeMark: {attendance.missingPersonalSlots.join(", ")}</p>}
                          {attendance.missingGroupSlots.length > 0 && (
                            <p className={attendance.missingPersonalSlots.length > 0 ? "mt-1" : ""}>Thiếu ảnh nhóm: {attendance.missingGroupSlots.join(", ")}</p>
                          )}
                        </div>
                      )}
                      {images.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {images.map((image) => {
                            const fullUrl = getFullImageUrl(image);
                            const displayUrl = getImageDisplayUrl(image);
                            if (!fullUrl || !displayUrl) return null;
                            return (
                              <a key={image.id} href={fullUrl} target="_blank" rel="noreferrer" className="group block">
                                <img
                                  src={displayUrl}
                                  alt={image.label}
                                  loading="lazy"
                                  onError={(event) => fallbackToFullImage(event, fullUrl)}
                                  className="aspect-video w-full rounded-lg border object-cover transition group-hover:opacity-80"
                                />
                                <p className="mt-1 truncate text-xs text-muted-foreground">{image.label}</p>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed bg-white p-4 text-center text-sm text-muted-foreground">
                          <ImageIcon className="mx-auto mb-2 h-6 w-6" />
                          Chưa có ảnh cho ca này.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-medium">
                  <BookOpenText className="h-4 w-4" />
                  Nhật ký thực tập
                </div>
                {day.reportEntry ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={day.reportEntry.enoughPages ? "success" : "warning"}>{day.reportEntry.pageCount}/{day.reportEntry.requiredPages} trang</Badge>
                      <Badge tone="muted">{day.reportEntry.shiftCodes || "Chưa có ca"}</Badge>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{day.reportEntry.content}</p>
                    {day.reportEntry.referenceLinks && (
                      <p className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-muted-foreground">{day.reportEntry.referenceLinks}</p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">Chưa có bài nhật ký cho ngày này.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
