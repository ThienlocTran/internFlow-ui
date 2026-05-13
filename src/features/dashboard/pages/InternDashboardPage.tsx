import { CalendarPlus, CheckCircle2, ClipboardCheck, Clock3, FileClock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { useAuthStore } from "@/store/auth-store";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";

export function InternDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, error } = useDashboardSummary();
  const policy = data?.rolePolicies.find((item) => item.role === user?.role);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message="Không tải được dữ liệu tổng quan. Hãy kiểm tra backend API." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-lg border bg-white/80 p-6 shadow-sm backdrop-blur-xl md:flex-row md:items-center">
        <div>
          <Badge tone="success">Khu sinh viên</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
            Xin chào, {user?.fullName}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Theo dõi quy định ca, lịch đăng ký và điểm danh cá nhân. Các số liệu bên dưới lấy trực tiếp từ backend.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>
            <CheckCircle2 className="h-4 w-4" />
            Điểm danh
          </Button>
          <Button variant="outline" className="bg-white">
            <CalendarPlus className="h-4 w-4" />
            Đăng ký ca
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Ca đang mở"
          value={String(data.shifts.length)}
          helper="Lấy từ API /shifts"
          trend="Dữ liệu thật"
          icon={ClipboardCheck}
        />
        <DashboardCard
          label="Tối đa/ngày"
          value={policy ? `${policy.maxShiftsPerDay} ca` : "Chưa có"}
          helper="Theo vai trò của bạn"
          trend={user?.role ?? "INTERN"}
          icon={Clock3}
        />
        <DashboardCard
          label="Mục tiêu/tuần"
          value={policy ? `${policy.targetShiftsPerWeek} ca` : "Chưa có"}
          helper="Tiến độ chuẩn"
          trend="Theo chính sách"
          icon={Target}
        />
        <DashboardCard
          label="Tổng yêu cầu"
          value={policy ? `${policy.requiredCompanyShifts + policy.requiredHomeShifts} ca` : "Chưa có"}
          helper="Công ty + ở nhà"
          trend={policy ? `${policy.requiredCompanyShifts}+${policy.requiredHomeShifts}` : "Chưa cấu hình"}
          icon={FileClock}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Danh sách ca</CardTitle>
            <CardDescription>Mỗi ca hiện giới hạn tối đa 9 bạn.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {data.shifts.map((shift) => (
              <div key={shift.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{shift.name}</p>
                  <Badge tone={shift.active ? "success" : "muted"}>{shift.active ? "Đang mở" : "Tắt"}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                </p>
                <p className="mt-3 text-sm">Sức chứa: {shift.maxParticipants} bạn</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Lịch sử điểm danh</CardTitle>
            <CardDescription>Chưa có endpoint lấy lịch sử cá nhân.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FileClock}
              title="Chưa có dữ liệu điểm danh"
              description="Cần bổ sung API lịch sử điểm danh theo user để hiển thị số ca đã đi, ca còn thiếu và tiến độ thực tế."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
