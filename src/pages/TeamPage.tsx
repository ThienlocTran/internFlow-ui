import { CalendarDays, Eye, FileText, SlidersHorizontal, UsersRound } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getRolePolicies } from "@/services/role-policy.service";
import { getLeaderShiftPeers } from "@/services/team.service";
import { getStudentDetail } from "@/services/cohort.service";
import { getReportProgress } from "@/services/report-journal.service";
import { useAuthStore } from "@/store/auth-store";
import { formatDate } from "@/utils/date-format";

const roleLabels: Record<string, string> = {
  INTERN: "Sinh viên thường",
  TEAM_LEADER: "Nhóm trưởng",
  MANAGER: "Quản lý",
  ADMIN: "Admin",
};

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function TeamPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { data: policies, isLoading, error } = useQuery({ queryKey: ["role-policies"], queryFn: getRolePolicies });
  const peersQuery = useQuery({
    queryKey: ["leader-shift-peers", user?.id, selectedDate],
    queryFn: () => getLeaderShiftPeers(user!.id, selectedDate),
    enabled: user?.role === "TEAM_LEADER",
  });
  const detailQuery = useQuery({
    queryKey: ["student-detail", selectedStudentId],
    queryFn: () => getStudentDetail(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  });
  const reportQuery = useQuery({
    queryKey: ["report-progress", selectedStudentId],
    queryFn: () => getReportProgress(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !policies) {
    return <ErrorState message="Không tải được chính sách thực tập." />;
  }

  const standardPolicy = policies.find((policy) => policy.role === "INTERN");
  const leaderPolicy = policies.find((policy) => policy.role === "TEAM_LEADER");
  const managementPolicies = policies.filter((policy) => policy.role === "ADMIN" || policy.role === "MANAGER");
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const peers = peersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">
          {isAdmin ? "Chính sách thực tập" : "Nhóm của tôi"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAdmin
            ? "Quản lý chính sách cho sinh viên, nhóm trưởng và tài khoản quản trị."
            : "Nhóm trưởng vẫn là sinh viên thực tập, được đi tối đa 9 ca/tuần và quản lý các bạn trùng ca mình đăng ký."}
        </p>
      </div>

      {isAdmin ? (
        <div className="grid gap-4">
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Quy định sinh viên thường</CardTitle>
              <CardDescription>Đây là rule chính hiển thị cho sinh viên và quản trị.</CardDescription>
            </CardHeader>
            <CardContent>
              {standardPolicy ? (
                <div className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">Sinh viên thường</p>
                    </div>
                    <Badge tone="muted">{standardPolicy.targetShiftsPerWeek} buổi/tuần</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Tối đa {standardPolicy.maxShiftsPerDay} ca/ngày · Tổng {standardPolicy.requiredCompanyShifts} ca
                    công ty + {standardPolicy.requiredHomeShifts} ca ở nhà
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nếu đủ {standardPolicy.nightShiftBonusThreshold} ca tối thì được cộng{" "}
                    {standardPolicy.nightShiftBonusAmount} ca thực tập bonus.
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={SlidersHorizontal}
                  title="Chưa có chính sách INTERN"
                  description="Backend cần seed RolePolicy cho sinh viên thường."
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Quy định nhóm trưởng</CardTitle>
              <CardDescription>Nhóm trưởng đi thực tập như sinh viên nhưng được tăng quota để hoàn thành nhanh hơn.</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderPolicy && (
                <div className="rounded-lg border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">Nhóm trưởng</p>
                    <Badge tone="warning">{leaderPolicy.targetShiftsPerWeek} ca/tuần</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Tối đa {leaderPolicy.maxShiftsPerDay} ca/ngày. Có thể xem sinh viên trùng ca mình đã đăng ký.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Vai trò quản lý</CardTitle>
              <CardDescription>Các vai trò này không có quota thực tập.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {managementPolicies.map((policy) => (
                <div key={policy.id} className="rounded-lg border bg-slate-50 p-4">
                  <p className="font-medium">{roleLabels[policy.role] ?? policy.role}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Không áp dụng ca thực tập.</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Ca tôi quản lý</CardTitle>
              <CardDescription>Chọn ngày đã đăng ký ca. Bạn sẽ thấy các sinh viên trùng ca với mình trong ngày đó.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Input type="date" className="max-w-64" value={selectedDate} onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setSelectedStudentId(null);
                }} />
                <Badge tone="muted">Quota nhóm trưởng: 3 ca/ngày · 9 ca/tuần</Badge>
              </div>

              {peersQuery.isLoading ? (
                <div className="flex min-h-32 items-center justify-center">
                  <LoadingSpinner className="h-7 w-7" />
                </div>
              ) : peers.length > 0 ? (
                <div className="grid gap-3">
                  {peers.map((peer) => (
                    <div key={peer.user.id} className="rounded-lg border bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{peer.user.fullName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {peer.user.studentCode || "Chưa có MSSV"} · {peer.user.studentClass || "Chưa có lớp"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {peer.schedules.map((schedule) => (
                              <Badge key={schedule.id} tone={peer.user.id === user?.id ? "warning" : "muted"}>
                                {schedule.shift.name} {schedule.shift.startTime.slice(0, 5)}-{schedule.shift.endTime.slice(0, 5)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedStudentId(peer.user.id)}>
                          <Eye className="h-4 w-4" />
                          Xem ảnh & báo cáo
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="Ngày này bạn chưa đăng ký ca"
                  description="Nhóm trưởng chỉ xem được sinh viên trong các ca mà mình cũng đã đăng ký."
                />
              )}
            </CardContent>
          </Card>

          {selectedStudentId && (
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle>Chi tiết sinh viên trùng ca</CardTitle>
                <CardDescription>Nhóm trưởng xem ảnh điểm danh và nhật ký của các bạn cùng ca.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {(detailQuery.isLoading || reportQuery.isLoading) && (
                  <div className="flex min-h-32 items-center justify-center">
                    <LoadingSpinner className="h-7 w-7" />
                  </div>
                )}
                {detailQuery.data && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border bg-slate-50 p-4">
                      <p className="text-sm text-muted-foreground">Sinh viên</p>
                      <p className="mt-1 font-semibold">{detailQuery.data.student.fullName}</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-4">
                      <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
                      <p className="mt-1 font-semibold">{detailQuery.data.completedCompanyShifts} ca</p>
                    </div>
                    <div className="rounded-lg border bg-slate-50 p-4">
                      <p className="text-sm text-muted-foreground">Còn thiếu</p>
                      <p className="mt-1 font-semibold">{detailQuery.data.remainingCompanyShifts} ca</p>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Ảnh điểm danh</h3>
                    {detailQuery.data?.attendances.length ? detailQuery.data.attendances.map((attendance) => (
                      <div key={attendance.attendanceId} className="rounded-lg border p-4">
                        <p className="font-medium">{formatDate(attendance.attendanceDate)} · {attendance.shiftName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ảnh cá nhân {attendance.uploadedPersonalImages}/{attendance.requiredPersonalImages} · Ảnh nhóm {attendance.uploadedGroupImages}/{attendance.requiredGroupImages}
                        </p>
                        {attendance.images.length > 0 && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {attendance.images.slice(0, 4).map((image) => (
                              <a key={image.id} href={image.imageUrl} target="_blank" rel="noreferrer">
                                <img src={image.imageUrl} alt={image.expectedTime} className="aspect-video rounded-md border object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )) : <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Chưa có buổi điểm danh.</p>}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Nhật ký thực tập</h3>
                    {reportQuery.data?.entries.length ? reportQuery.data.entries.map((entry) => (
                      <div key={entry.id} className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="h-4 w-4" />
                          {formatDate(entry.workDate)} · {entry.shiftCodes}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {entry.pageCount}/{entry.requiredPages} trang · {entry.enoughPages ? "Đủ trang" : "Chưa đủ trang"}
                        </p>
                        <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{entry.content}</p>
                      </div>
                    )) : <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Chưa có nhật ký.</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
