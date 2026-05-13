import { Download, FileSpreadsheet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getUsers } from "@/services/user.service";
import { getCohorts } from "@/services/cohort.service";
import { downloadCsv } from "@/utils/export-csv";
import { formatDate } from "@/utils/date-format";

export function ReportsPage() {
  const usersQuery = useQuery({ queryKey: ["users"], queryFn: getUsers });
  const cohortsQuery = useQuery({ queryKey: ["cohorts"], queryFn: getCohorts });

  if (usersQuery.isLoading || cohortsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (usersQuery.error || cohortsQuery.error || !usersQuery.data || !cohortsQuery.data) {
    return <ErrorState message="Không tải được dữ liệu báo cáo từ backend." />;
  }

  const users = usersQuery.data;
  const cohorts = cohortsQuery.data;

  const exportUsers = () => {
    downloadCsv(
      "bao-cao-nguoi-dung.csv",
      ["Họ tên", "Email", "MSSV", "Lớp", "Trường", "SĐT", "Khóa", "Vai trò", "Trạng thái"],
      users.map((user) => [
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

  const exportCohorts = () => {
    downloadCsv(
      "bao-cao-khoa-thuc-tap.csv",
      ["Mã khóa", "Tên khóa", "Ngày bắt đầu", "Ngày kết thúc", "Đang mở", "Mặc định cho sinh viên mới"],
      cohorts.map((cohort) => [
        cohort.code,
        cohort.name,
        formatDate(cohort.startDate),
        formatDate(cohort.endDate),
        cohort.active ? "Có" : "Không",
        cohort.defaultForNewStudents ? "Có" : "Không",
      ]),
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Báo cáo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Xuất hồ sơ phục vụ xác nhận và quản lý thực tập.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-950 p-3 text-white">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Báo cáo người dùng</CardTitle>
                <CardDescription>{users.length} hồ sơ trong hệ thống.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={exportUsers}>
              <Download className="h-4 w-4" />
              Xuất CSV người dùng
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-950 p-3 text-white">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Báo cáo khóa thực tập</CardTitle>
                <CardDescription>{cohorts.length} khóa đã tạo.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button onClick={exportCohorts}>
              <Download className="h-4 w-4" />
              Xuất CSV khóa
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
