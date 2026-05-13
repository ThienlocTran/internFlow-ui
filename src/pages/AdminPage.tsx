import { useMemo, useState } from "react";
import { AlertTriangle, Download, Eye, ShieldCheck, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { createCohort, getCohorts, getCohortStudents, getStudentDetail } from "@/services/cohort.service";
import { getUsers } from "@/services/user.service";
import { downloadCsv } from "@/utils/export-csv";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    startDate: today(),
    endDate: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cohortsQuery = useQuery({ queryKey: ["cohorts"], queryFn: getCohorts });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: !selectedCohortId,
  });
  const cohortStudentsQuery = useQuery({
    queryKey: ["cohort-students", selectedCohortId],
    queryFn: () => getCohortStudents(selectedCohortId),
    enabled: Boolean(selectedCohortId),
  });
  const studentDetailQuery = useQuery({
    queryKey: ["student-detail", selectedStudentId],
    queryFn: () => getStudentDetail(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createCohort({
        code: form.code,
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        active: true,
        defaultForNewStudents: true,
      }),
    onSuccess: (cohort) => {
      setErrorMessage(null);
      setSelectedCohortId(cohort.id);
      setForm({ code: "", name: "", startDate: today(), endDate: "" });
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể tạo khóa.");
    },
  });

  const users = selectedCohortId ? cohortStudentsQuery.data : usersQuery.data;
  const isLoading = cohortsQuery.isLoading || usersQuery.isLoading || cohortStudentsQuery.isLoading;
  const hasError = cohortsQuery.error || usersQuery.error || cohortStudentsQuery.error;
  const selectedCohort = useMemo(
    () => cohortsQuery.data?.find((cohort) => cohort.id === selectedCohortId),
    [cohortsQuery.data, selectedCohortId],
  );
  const exportVisibleUsers = () => {
    downloadCsv(
      selectedCohort ? `sinh-vien-${selectedCohort.code}.csv` : "nguoi-dung-internflow.csv",
      ["Họ tên", "Email", "MSSV", "Lớp", "Trường", "SĐT", "Khóa", "Vai trò", "Trạng thái"],
      (users ?? []).map((user) => [
        user.fullName,
        user.email,
        user.studentCode,
        user.studentClass,
        user.school,
        user.phone,
        user.cohort?.name,
        user.role,
        user.active ? "Đang hoạt động" : "Tạm khóa",
      ]),
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (hasError || !users || !cohortsQuery.data) {
    return <ErrorState message="Không tải được dữ liệu quản trị từ backend." />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Người dùng & khóa thực tập</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Quản lý sinh viên theo từng khóa để tránh trùng dữ liệu giữa các đợt thực tập.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Tạo khóa thực tập</CardTitle>
            <CardDescription>Sinh viên tạo hồ sơ mới sẽ tự vào khóa đang mở mới nhất.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Mã khóa, ví dụ K2026-05"
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
            />
            <Input
              placeholder="Tên khóa, ví dụ Thực tập tháng 05/2026"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))}
              />
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
            {errorMessage && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMessage}</p>}
            <Button
              className="w-full"
              disabled={!form.code.trim() || !form.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              Tạo khóa
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Danh sách khóa</CardTitle>
            <CardDescription>Chọn một khóa để xem sinh viên thuộc khóa đó.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant={!selectedCohortId ? "default" : "outline"} onClick={() => setSelectedCohortId("")}>
              Tất cả người dùng
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {cohortsQuery.data.map((cohort) => (
                <button
                  key={cohort.id}
                  type="button"
                  className={`rounded-lg border p-4 text-left transition ${
                    selectedCohortId === cohort.id ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedCohortId(cohort.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{cohort.name}</p>
                    <Badge tone={cohort.active ? "success" : "muted"}>{cohort.active ? "Đang mở" : "Đã đóng"}</Badge>
                  </div>
                  <p className={selectedCohortId === cohort.id ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm text-muted-foreground"}>
                    {cohort.code} · {cohort.startDate}
                    {cohort.endDate ? ` - ${cohort.endDate}` : ""}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle>{selectedCohort ? `Sinh viên trong ${selectedCohort.name}` : "Danh sách người dùng"}</CardTitle>
              <CardDescription>Dữ liệu lấy từ API thật. Bấm “Chi tiết” để xem ảnh và tiến độ báo cáo.</CardDescription>
            </div>
            <Button variant="outline" onClick={exportVisibleUsers}>
              <Download className="h-4 w-4" />
              Xuất CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-3 font-medium">Họ tên</th>
                <th className="py-3 font-medium">Email</th>
                <th className="py-3 font-medium">MSSV</th>
                <th className="py-3 font-medium">Lớp</th>
                <th className="py-3 font-medium">Khóa</th>
                <th className="py-3 font-medium">Vai trò</th>
                <th className="py-3 font-medium">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="py-4 font-medium">{user.fullName}</td>
                  <td className="py-4 text-muted-foreground">{user.email}</td>
                  <td className="py-4">{user.studentCode || "Chưa có"}</td>
                  <td className="py-4">{user.studentClass || "Chưa có"}</td>
                  <td className="py-4">{user.cohort?.name || "Chưa gán khóa"}</td>
                  <td className="py-4">
                    <Badge tone={user.role === "ADMIN" || user.role === "MANAGER" ? "warning" : "muted"}>{user.role}</Badge>
                  </td>
                  <td className="py-4">
                    <Button size="sm" variant="outline" onClick={() => setSelectedStudentId(user.id)}>
                      <Eye className="h-4 w-4" />
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="mt-6 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
              Chưa có sinh viên trong khóa này.
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudentId && (
        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Chi tiết sinh viên</CardTitle>
                <CardDescription>Kiểm tra tổng ca, ảnh điểm danh và số trang báo cáo theo từng ca.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => setSelectedStudentId(null)}>
                Đóng
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {studentDetailQuery.isLoading && (
              <div className="flex min-h-40 items-center justify-center">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            )}
            {studentDetailQuery.data && (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Sinh viên</p>
                    <p className="mt-1 font-semibold">{studentDetailQuery.data.student.fullName}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
                    <p className="mt-1 font-semibold">{studentDetailQuery.data.completedCompanyShifts} ca</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Còn thiếu</p>
                    <p className="mt-1 font-semibold">{studentDetailQuery.data.remainingCompanyShifts} ca</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Yêu cầu</p>
                    <p className="mt-1 font-semibold">
                      {studentDetailQuery.data.requiredCompanyShifts} công ty + {studentDetailQuery.data.requiredHomeShifts} ở nhà
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {studentDetailQuery.data.attendances.map((attendance) => (
                    <div key={attendance.attendanceId} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            {attendance.attendanceDate} · {attendance.shiftName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Ảnh cá nhân {attendance.uploadedPersonalImages}/{attendance.requiredPersonalImages} · Ảnh nhóm{" "}
                            {attendance.uploadedGroupImages}/{attendance.requiredGroupImages} · Báo cáo{" "}
                            {attendance.submittedReportPages}/{attendance.requiredReportPages} trang
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone={attendance.enoughImages ? "success" : "warning"}>
                            {attendance.enoughImages ? "Đủ ảnh" : "Thiếu ảnh"}
                          </Badge>
                          <Badge tone={attendance.enoughReportPages ? "success" : "warning"}>
                            {attendance.enoughReportPages ? "Đủ báo cáo" : "Thiếu 8 trang"}
                          </Badge>
                        </div>
                      </div>
                      {(!attendance.enoughImages || !attendance.enoughReportPages) && (
                        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                          <AlertTriangle className="mt-0.5 h-4 w-4" />
                          <span>
                            Thiếu {attendance.missingPersonalImages} ảnh cá nhân, {attendance.missingGroupImages} ảnh nhóm và{" "}
                            {Math.max(0, attendance.requiredReportPages - attendance.submittedReportPages)} trang báo cáo.
                          </span>
                        </div>
                      )}
                      {attendance.images.length > 0 && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {attendance.images.map((image) => (
                            <a key={image.id} href={image.imageUrl} target="_blank" rel="noreferrer" className="group block">
                              <img
                                src={image.imageUrl}
                                alt={`${image.imageType} ${image.expectedTime}`}
                                className="aspect-video w-full rounded-md border object-cover transition group-hover:opacity-80"
                              />
                              <p className="mt-1 text-xs text-muted-foreground">
                                {image.imageType} · {image.expectedTime}
                              </p>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {studentDetailQuery.data.attendances.length === 0 && (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                      <UserRound className="mx-auto mb-3 h-8 w-8" />
                      Sinh viên này chưa có buổi điểm danh nào.
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
