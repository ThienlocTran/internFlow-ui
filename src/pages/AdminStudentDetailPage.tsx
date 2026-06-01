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
          {detail.workDays.length > 0 && (
            <div className="overflow-hidden rounded-xl border bg-white">
              <div className="hidden grid-cols-[1.1fr_1fr_1fr_48px] gap-3 border-b bg-slate-50 px-4 py-3 text-sm font-medium text-muted-foreground md:grid">
                <span>Ngày đi</span>
                <span>Ca đi</span>
                <span>Trạng thái</span>
                <span />
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
