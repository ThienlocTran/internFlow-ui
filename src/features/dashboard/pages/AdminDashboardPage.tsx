import { AlertTriangle, BarChart3, Database, FileDown, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { downloadCsv } from "@/utils/export-csv";

export function AdminDashboardPage() {
  const { data, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message="Không tải được dữ liệu quản trị. Hãy kiểm tra backend API." />;
  }

  const internshipUsers = data.users.filter((user) => user.role === "INTERN").length;
  const leaders = data.users.filter((user) => user.role === "TEAM_LEADER").length;
  const admins = data.users.filter((user) => user.role === "ADMIN" || user.role === "MANAGER").length;
  const totalCapacity = data.shifts.reduce((total, shift) => total + shift.maxParticipants, 0);
  const standardPolicy = data.rolePolicies.find((policy) => policy.role === "INTERN");
  const exportUsers = () => {
    downloadCsv(
      "internflow-users.csv",
      ["Họ tên", "Email", "MSSV", "Lớp", "Trường", "Khóa", "Vai trò", "Trạng thái"],
      data.users.map((user) => [
        user.fullName,
        user.email,
        user.studentCode,
        user.studentClass,
        user.school,
        user.cohort?.name,
        user.role,
        user.active ? "Đang hoạt động" : "Tạm khóa",
      ]),
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-lg border border-slate-800 bg-slate-950 p-6 text-white shadow-sm">
        <Badge className="bg-white text-slate-950">Khu quản trị</Badge>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Trung tâm quản trị InternFlow</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Quản lý sinh viên, nhóm trưởng, admin, ca thực tập, sức chứa và báo cáo. Quota chỉ áp dụng cho sinh viên.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-white text-slate-950 hover:bg-slate-100" onClick={exportUsers}>
              <FileDown className="h-4 w-4" />
              Xuất báo cáo
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
              <Link to="/team">
                <ShieldCheck className="h-4 w-4" />
                Chính sách
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Tổng người dùng" value={String(data.users.length)} helper="Tài khoản trong hệ thống" trend="Đang hoạt động" icon={UsersRound} />
        <DashboardCard label="Sinh viên thực tập" value={String(internshipUsers)} helper="Role INTERN" trend="Có quota" icon={UsersRound} />
        <DashboardCard label="Nhóm trưởng" value={String(leaders)} helper="Quản lý nhóm" trend="Không quota" icon={ShieldCheck} />
        <DashboardCard label="Sức chứa/ngày" value={String(totalCapacity)} helper="Tổng sức chứa ca" trend="9 bạn/ca" icon={Database} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Người dùng trong hệ thống</CardTitle>
            <CardDescription>Quản lý hồ sơ, vai trò và trạng thái tài khoản.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-3 font-medium">Họ tên</th>
                  <th className="py-3 font-medium">Email</th>
                  <th className="py-3 font-medium">MSSV</th>
                  <th className="py-3 font-medium">Vai trò</th>
                  <th className="py-3 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="py-4 font-medium">{user.fullName}</td>
                    <td className="py-4 text-muted-foreground">{user.email}</td>
                    <td className="py-4">{user.studentCode || "Chưa có"}</td>
                    <td className="py-4">
                      <Badge tone={user.role === "ADMIN" || user.role === "MANAGER" ? "warning" : "muted"}>{user.role}</Badge>
                    </td>
                    <td className="py-4">
                      <Badge tone={user.active ? "success" : "muted"}>{user.active ? "Đang hoạt động" : "Tạm khóa"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Chính sách thực tập</CardTitle>
            <CardDescription>Trang chính chỉ hiển thị quy định chuẩn cho sinh viên.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {standardPolicy && (
              <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">Sinh viên thường</p>
                  <Badge tone="muted">{standardPolicy.targetShiftsPerWeek} buổi/tuần</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tối đa {standardPolicy.maxShiftsPerDay} ca/ngày · Tổng {standardPolicy.requiredCompanyShifts} ca công ty +{" "}
                  {standardPolicy.requiredHomeShifts} ca ở nhà
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Đủ {standardPolicy.nightShiftBonusThreshold} ca tối được cộng{" "}
                  {standardPolicy.nightShiftBonusAmount} ca thực tập bonus.
                </p>
              </div>
            )}
            {admins === 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                Chưa có tài khoản quản trị trong dữ liệu trả về.
              </div>
            )}
            <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
              <BarChart3 className="mr-2 inline h-4 w-4" />
              Theo dõi số ca, nhật ký và minh chứng điểm danh của từng sinh viên trong trang quản trị.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
