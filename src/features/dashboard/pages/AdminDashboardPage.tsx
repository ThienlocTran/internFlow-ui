import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, CalendarDays, Camera, CheckCircle2, Database, Eye, FileDown, Mail, NotebookText, ShieldCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useDashboardSummary } from "@/features/dashboard/hooks/use-dashboard-summary";
import { getAdminDailyCompliance } from "@/services/admin-compliance.service";
import type { AdminDailyComplianceStudent } from "@/types/api";
import { downloadCsv } from "@/utils/export-csv";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function previewList(items: string[], fallback = "Du") {
  if (items.length === 0) return fallback;
  const visible = items.slice(0, 2).join(", ");
  return items.length > 2 ? `${visible} +${items.length - 2}` : visible;
}

function mailLabel(row: AdminDailyComplianceStudent) {
  if (row.mailSent) return "Da gui";
  return row.mailStatus === "FAILED" ? "Loi gui" : "Chua gui";
}

function StatusBadge({ ready, okLabel = "Du", missingLabel = "Thieu" }: { ready: boolean; okLabel?: string; missingLabel?: string }) {
  return <Badge tone={ready ? "success" : "warning"}>{ready ? okLabel : missingLabel}</Badge>;
}

export function AdminDashboardPage() {
  const [complianceDate, setComplianceDate] = useState(today());
  const { data, isLoading, error } = useDashboardSummary(true);
  const complianceQuery = useQuery({
    queryKey: ["admin-daily-compliance", complianceDate],
    queryFn: () => getAdminDailyCompliance(complianceDate),
    enabled: Boolean(complianceDate),
  });

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
  const admins = data.users.filter((user) => user.role === "ADMIN").length;
  const totalCapacity = data.shifts.reduce((total, shift) => total + shift.maxParticipants, 0);
  const standardPolicy = data.rolePolicies.find((policy) => policy.role === "INTERN");
  const dailyCompliance = complianceQuery.data;
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
        <DashboardCard label="Tong nguoi dung" value={String(data.users.length)} helper="Tat ca tai khoan" trend="Hoat dong" icon={UsersRound} />
        <DashboardCard label="Sinh vien thuc tap" value={String(internshipUsers)} helper="Role INTERN" trend="Co quota" icon={UsersRound} />
        <DashboardCard label="Nhom truong" value={String(leaders)} helper="Quan ly nhom" trend="Khong quota" icon={ShieldCheck} />
        <DashboardCard label="Suc chua/ngay" value={String(totalCapacity)} helper="Tong suc chua ca" trend="9 ban/ca" icon={Database} />
      </section>
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">Compliance theo ngay</h2>
            <p className="mt-1 text-sm text-muted-foreground">Kiem tra dang ky, diem danh, anh, nhat ky va mail cua tung sinh vien.</p>
          </div>
          <div className="flex w-full items-center gap-2 md:w-auto">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Input type="date" className="md:w-48" value={complianceDate} onChange={(event) => setComplianceDate(event.target.value)} />
          </div>
        </div>

        {complianceQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center rounded-lg border bg-white/90">
            <LoadingSpinner className="h-6 w-6" />
          </div>
        ) : complianceQuery.error || !dailyCompliance ? (
          <ErrorState message="Khong tai duoc dashboard compliance theo ngay." />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
              <DashboardCard label="Co dang ky" value={`${dailyCompliance.summary.registeredStudents}/${dailyCompliance.summary.totalStudents}`} helper="Sinh vien co ca" trend="Theo ngay" icon={CalendarDays} />
              <DashboardCard label="Du diem danh" value={`${dailyCompliance.summary.attendanceReadyStudents}/${dailyCompliance.summary.totalStudents}`} helper="Khong thieu ca" trend="Theo ngay" icon={CheckCircle2} />
              <DashboardCard label="Du anh" value={`${dailyCompliance.summary.photoReadyStudents}/${dailyCompliance.summary.totalStudents}`} helper="Dung moc anh" trend="Theo ngay" icon={Camera} />
              <DashboardCard label="Du nhat ky" value={`${dailyCompliance.summary.journalReadyStudents}/${dailyCompliance.summary.totalStudents}`} helper="Trang va nguon" trend="Theo ngay" icon={NotebookText} />
              <DashboardCard label="Da gui mail" value={`${dailyCompliance.summary.mailSentStudents}/${dailyCompliance.summary.totalStudents}`} helper="SENT/confirmed" trend="Theo ngay" icon={Mail} />
              <DashboardCard label="Hoan tat" value={`${dailyCompliance.summary.compliantStudents}/${dailyCompliance.summary.totalStudents}`} helper="Tat ca dieu kien" trend="Theo ngay" icon={ShieldCheck} />
              <DashboardCard label="Can bo sung" value={String(dailyCompliance.summary.totalStudents - dailyCompliance.summary.compliantStudents)} helper="Con thieu muc" trend="Theo ngay" icon={AlertTriangle} />
            </div>

            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle>Trang thai sinh vien ngay {dailyCompliance.workDate}</CardTitle>
                <CardDescription>MVP bang: tap trung vao ai thieu gi, khong bieu do nang cao.</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 font-medium">Sinh vien</th>
                      <th className="py-3 font-medium">Dang ky</th>
                      <th className="py-3 font-medium">Diem danh</th>
                      <th className="py-3 font-medium">Anh</th>
                      <th className="py-3 font-medium">Nhat ky</th>
                      <th className="py-3 font-medium">Mail</th>
                      <th className="py-3 font-medium">Tong</th>
                      <th className="py-3 font-medium">Chi tiet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyCompliance.students.map((row) => (
                      <tr key={row.student.id} className="border-b align-top last:border-0">
                        <td className="py-4 pr-4">
                          <p className="font-medium">{row.student.fullName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{row.student.studentCode || row.student.email}</p>
                          <Badge tone="muted" className="mt-2">{row.student.role}</Badge>
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge ready={row.scheduleReady} />
                          <p className="mt-2 max-w-40 text-xs text-muted-foreground">{previewList(row.registeredShifts, "Chua dang ky")}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge ready={row.attendanceReady} />
                          <p className="mt-2 text-xs text-muted-foreground">{row.attendanceCount}/{row.scheduleCount} ca</p>
                          <p className="mt-1 max-w-48 text-xs text-muted-foreground">{previewList(row.missingAttendanceShifts)}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge ready={row.photosReady} />
                          <p className="mt-2 text-xs text-muted-foreground">{row.satisfiedPhotoCount + row.skippedPhotoCount}/{row.requiredPhotoCount} anh</p>
                          <p className="mt-1 max-w-56 text-xs text-muted-foreground">{previewList(row.missingPhotos)}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge ready={row.journalReady} />
                          <p className="mt-2 text-xs text-muted-foreground">{row.submittedReportPages}/{row.requiredReportPages} trang</p>
                          <p className="mt-1 max-w-56 text-xs text-muted-foreground">{previewList(row.journalIssues)}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge ready={row.mailSent} okLabel="Da gui" missingLabel={row.mailStatus === "FAILED" ? "Loi" : "Chua gui"} />
                          <p className="mt-2 text-xs text-muted-foreground">{mailLabel(row)} - {row.mailStatus}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <StatusBadge ready={row.compliant} okLabel="Hoan tat" missingLabel="Can bo sung" />
                        </td>
                        <td className="py-4">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/admin/students/${row.student.id}`}>
                              <Eye className="h-4 w-4" />
                              Mo
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dailyCompliance.students.length === 0 && (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Chua co sinh vien active de hien thi.</div>
                )}
              </CardContent>
            </Card>
          </>
        )}
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
                      <Badge tone={user.role === "ADMIN" ? "warning" : "muted"}>{user.role}</Badge>
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
