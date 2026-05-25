import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BookOpenText, Image as ImageIcon, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getAdminStudentDetail } from "@/services/cohort.service";
import type { AttendanceAudit, AttendanceImage } from "@/types/api";
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
  }));
  return [...legacy, ...extra];
}

export function AdminStudentDetailPage() {
  const { studentId } = useParams();
  const detailQuery = useQuery({
    queryKey: ["admin-student-detail", studentId],
    queryFn: () => getAdminStudentDetail(studentId!),
    enabled: Boolean(studentId),
  });

  if (!studentId) {
    return <ErrorState message="Thiếu mã sinh viên cần xem chi tiết." />;
  }

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) {
    return <ErrorState message="Không tải được chi tiết sinh viên từ backend." />;
  }

  const detail = detailQuery.data;

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-4 bg-white">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-normal">Chi tiết sinh viên</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Xem từng ngày đã đi, ảnh điểm danh, trạng thái thiếu minh chứng và nhật ký thực tập.
          </p>
        </div>
        <Badge tone={detail.student.role === "TEAM_LEADER" ? "warning" : "muted"}>{detail.student.role}</Badge>
      </div>

      <Card className="bg-white/90">
        <CardContent className="grid gap-3 p-5 md:grid-cols-4">
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Sinh viên</p>
            <p className="mt-1 font-semibold">{detail.student.fullName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail.student.email}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">MSSV / Lớp</p>
            <p className="mt-1 font-semibold">{detail.student.studentCode || "Chưa có"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail.student.studentClass || "Chưa có lớp"}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
            <p className="mt-1 font-semibold">{detail.completedCompanyShifts} ca</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm text-muted-foreground">Còn thiếu</p>
            <p className="mt-1 font-semibold">{detail.remainingCompanyShifts} ca</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Các ngày đã đi</CardTitle>
          <CardDescription>Mỗi ngày hiển thị ca đã điểm danh, ảnh còn thiếu và tình trạng nhật ký.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {detail.workDays.map((day) => (
            <div key={day.workDate} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{formatDate(day.workDate)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {day.attendances.length} ca · báo cáo {day.submittedReportPages}/{day.requiredReportPages} trang
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={day.enoughImages ? "success" : "warning"}>{day.enoughImages ? "Đủ ảnh" : "Thiếu ảnh"}</Badge>
                  <Badge tone={day.enoughReportPages ? "success" : "warning"}>
                    {day.enoughReportPages ? "Đủ báo cáo" : `Thiếu ${day.missingReportPages} trang`}
                  </Badge>
                </div>
              </div>

              {(!day.enoughImages || !day.enoughReportPages) && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <span>
                    Thiếu {day.missingPersonalImages} ảnh cá nhân, {day.missingGroupImages} ảnh nhóm
                    {day.missingReportPages > 0 ? ` và ${day.missingReportPages} trang báo cáo.` : "."}
                  </span>
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
                              Cá nhân {attendance.uploadedPersonalImages}/{attendance.requiredPersonalImages} · Nhóm{" "}
                              {attendance.uploadedGroupImages}/{attendance.requiredGroupImages}
                            </p>
                          </div>
                          <Badge tone={attendance.enoughImages ? "success" : "warning"}>
                            {attendance.enoughImages ? "Đủ minh chứng" : "Còn thiếu"}
                          </Badge>
                        </div>
                        {!attendance.enoughImages && (
                          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                            {attendance.missingPersonalSlots.length > 0 && (
                              <p>Thi?u TimeMark: {attendance.missingPersonalSlots.join(", ")}</p>
                            )}
                            {attendance.missingGroupSlots.length > 0 && (
                              <p className={attendance.missingPersonalSlots.length > 0 ? "mt-1" : ""}>
                                Thi?u ?nh nh?m: {attendance.missingGroupSlots.join(", ")}
                              </p>
                            )}
                          </div>
                        )}
                        {images.length > 0 ? (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {images.map((image) => (
                              <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="group block">
                                <img
                                  src={image.url}
                                  alt={image.label}
                                  className="aspect-video w-full rounded-lg border object-cover transition group-hover:opacity-80"
                                />
                                <p className="mt-1 truncate text-xs text-muted-foreground">{image.label}</p>
                              </a>
                            ))}
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
                        <Badge tone={day.reportEntry.enoughPages ? "success" : "warning"}>
                          {day.reportEntry.pageCount}/{day.reportEntry.requiredPages} trang
                        </Badge>
                        <Badge tone="muted">{day.reportEntry.shiftCodes || "Chưa có ca"}</Badge>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{day.reportEntry.content}</p>
                      {day.reportEntry.referenceLinks && (
                        <p className="mt-3 whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-muted-foreground">
                          {day.reportEntry.referenceLinks}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-3 rounded-lg border border-dashed bg-white p-4 text-sm text-muted-foreground">
                      Chưa có bài nhật ký cho ngày này.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {detail.workDays.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <UserRound className="mx-auto mb-3 h-8 w-8" />
              Sinh viên này chưa có ngày thực tập nào.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
