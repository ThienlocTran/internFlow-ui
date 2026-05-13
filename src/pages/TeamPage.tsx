import { SlidersHorizontal, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getRolePolicies } from "@/services/role-policy.service";
import { useAuthStore } from "@/store/auth-store";

const roleLabels: Record<string, string> = {
  INTERN: "Sinh viên thường",
  TEAM_LEADER: "Nhóm trưởng",
  MANAGER: "Quản lý",
  ADMIN: "Admin",
};

export function TeamPage() {
  const user = useAuthStore((state) => state.user);
  const { data: policies, isLoading, error } = useQuery({ queryKey: ["role-policies"], queryFn: getRolePolicies });

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
  const managementPolicies = policies.filter((policy) => policy.role !== "INTERN");
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">
          {isAdmin ? "Chính sách thực tập" : "Nhóm của tôi"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAdmin
            ? "Trang chính chỉ hiển thị quy định chuẩn cho sinh viên. Các chế độ đặc biệt để admin cấu hình nội bộ."
            : "Nhóm trưởng theo dõi thành viên, không cần quota thực tập riêng."}
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
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Thành viên nhóm</CardTitle>
            <CardDescription>Dữ liệu nhóm sẽ lấy từ API team theo nhóm trưởng.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={UsersRound}
              title="Chưa có API lấy nhóm của nhóm trưởng"
              description="Cần endpoint lấy team theo leader và danh sách thành viên để hiển thị tiến độ thật."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
