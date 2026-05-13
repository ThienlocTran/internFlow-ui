import type { DashboardMetric } from "@/types/dashboard";
import type { RolePolicy, Shift, User } from "@/types/api";
import { getRolePolicies } from "@/services/role-policy.service";
import { getShifts } from "@/services/shift.service";
import { getUsers } from "@/services/user.service";

export type DashboardSummary = {
  metrics: DashboardMetric[];
  users: User[];
  shifts: Shift[];
  rolePolicies: RolePolicy[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [users, shifts, rolePolicies] = await Promise.all([getUsers(), getShifts(), getRolePolicies()]);

  return {
    metrics: [
      { label: "Người dùng", value: String(users.length), helper: "Tài khoản trong hệ thống", trend: "Đang quản lý" },
      { label: "Ca đang mở", value: String(shifts.length), helper: "Ca có thể điểm danh", trend: "Tối đa 9 bạn/ca" },
      { label: "Chính sách vai trò", value: String(rolePolicies.length), helper: "Quota theo quyền", trend: "Đang áp dụng" },
      {
        label: "Sức chứa/ngày",
        value: String(shifts.reduce((total, shift) => total + shift.maxParticipants, 0)),
        helper: "Tổng slot các ca",
        trend: "Từ cấu hình ca",
      },
    ],
    users,
    shifts,
    rolePolicies,
  };
}
