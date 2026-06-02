import { AlertTriangle, CalendarCheck2, CheckCircle2, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { useNavigate } from "react-router-dom";

export function TeamLeaderDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { data, isLoading, error } = useDashboardSummary();
  const policy = data?.rolePolicies.find((item) => item.role === "TEAM_LEADER");

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message="Không tải được dữ liệu nhóm trưởng. Hãy kiểm tra backend API." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border bg-white/80 p-6 shadow-sm backdrop-blur-xl">
        <Badge tone="warning">Khu nhóm trưởng</Badge>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Quản lý nhóm, {user?.fullName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Theo dõi thành viên, lịch tham gia và các trường hợp cần nhắc nhở trong nhóm.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Vai trò của tôi" value="TEAM_LEADER" helper="Quản lý sinh viên trùng ca" trend="InternFlow" icon={UsersRound} />
        <DashboardCard label="Ca đang mở" value={String(data.shifts.length)} helper="Khung giờ áp dụng" trend="9 bạn/ca" icon={CalendarCheck2} />
        <DashboardCard label="Tối đa/ngày" value={policy ? `${policy.maxShiftsPerDay} ca` : "Chưa có"} helper="Nhóm trưởng" trend="Theo chính sách" icon={AlertTriangle} />
        <DashboardCard label="Mục tiêu/tuần" value={policy ? `${policy.targetShiftsPerWeek} ca` : "Chưa có"} helper="Quota nhóm trưởng" trend="Theo chính sách" icon={CheckCircle2} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Thành viên nhóm</CardTitle>
            <CardDescription>Danh sách thành viên và tiến độ thực tập của nhóm.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={UsersRound}
              title="Chưa có thành viên trong nhóm"
              description="Khi admin gán sinh viên vào nhóm, danh sách và tiến độ từng bạn sẽ hiển thị tại đây."
            />
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Tình trạng sức chứa ca</CardTitle>
            <CardDescription>Theo dõi sức chứa từng khung giờ.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.shifts.map((shift) => (
              <button key={shift.id} type="button" className="w-full rounded-lg border bg-white p-4 text-left transition hover:border-slate-400 hover:bg-slate-50" onClick={() => navigate("/team")}>
                <div className="flex items-center justify-between">
                  <p className="font-medium">{shift.name}</p>
                  <Badge tone="muted">{shift.maxParticipants} bạn</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
