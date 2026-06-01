import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getAdminStudentDetail } from "@/services/cohort.service";
import { formatDate } from "@/utils/date-format";

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
            Xem danh sách ngày đã đi, ca đi và trạng thái minh chứng.
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
          <CardDescription>Danh sách ngày đã đi, ca đi và trạng thái minh chứng.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
<<<<<<< HEAD
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
                              <p>Thiếu TimeMark: {attendance.missingPersonalSlots.join(", ")}</p>
                            )}
                            {attendance.missingGroupSlots.length > 0 && (
                              <p className={attendance.missingPersonalSlots.length > 0 ? "mt-1" : ""}>
                                Thiếu ảnh nhóm: {attendance.missingGroupSlots.join(", ")}
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
=======
          {detail.workDays.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="hidden grid-cols-[1.1fr_1fr_1fr_48px] gap-3 border-b bg-slate-50 px-4 py-3 text-sm font-medium text-muted-foreground md:grid">
                <span>Ngày đi</span>
                <span>Ca đi</span>
                <span>Trạng thái</span>
                <span />
>>>>>>> 73e117ed1837f2c44475fa0a4b8c96d7dd3b6b0c
              </div>
              {detail.workDays.map((day) => {
                const isComplete = day.enoughImages && day.enoughReportPages;
                return (
                  <Link
                    key={day.workDate}
                    to={`/admin/students/${studentId}/days/${day.workDate}`}
                    className="grid w-full grid-cols-1 items-center gap-3 border-b bg-white px-4 py-4 text-left last:border-b-0 hover:bg-slate-50 md:grid-cols-[1.1fr_1fr_1fr_48px]"
                  >
                    <div>
                      <p className="font-semibold">{formatDate(day.workDate)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Báo cáo {day.submittedReportPages}/{day.requiredReportPages} trang</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{day.attendances.map((attendance) => attendance.shiftName).join(", ") || "Chưa có ca"}</p>
                      <p className="mt-1 text-muted-foreground">{day.attendances.length} ca</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={isComplete ? "success" : "warning"}>{isComplete ? "Đủ" : "Thiếu"}</Badge>
                      {!day.enoughImages && <Badge tone="warning">Thiếu ảnh</Badge>}
                      {!day.enoughReportPages && <Badge tone="warning">Thiếu file báo cáo</Badge>}
                    </div>
                    <ChevronRight className="h-4 w-4 justify-self-end text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}

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
