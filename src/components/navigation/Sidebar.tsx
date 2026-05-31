import { NavLink } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  Database,
  FileCheck2,
  BookOpenText,
  LayoutDashboard,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/api";
import { Button } from "@/components/ui/button";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
};

const navItems: NavItem[] = [
  { label: "Tổng quan cá nhân", href: "/dashboard", icon: LayoutDashboard, roles: ["INTERN", "TEAM_LEADER"] },
  { label: "Điểm danh của tôi", href: "/attendance", icon: ClipboardCheck, roles: ["INTERN", "TEAM_LEADER"] },
  { label: "Lịch đăng ký", href: "/schedule", icon: CalendarDays, roles: ["INTERN", "TEAM_LEADER"] },
  { label: "Nhật ký thực tập", href: "/journal", icon: BookOpenText, roles: ["INTERN", "TEAM_LEADER"] },
  { label: "Quản lý ca của tôi", href: "/team", icon: UsersRound, roles: ["TEAM_LEADER"] },
  { label: "Tổng quan quản trị", href: "/dashboard", icon: ShieldCheck, roles: ["ADMIN", "MANAGER"] },
  { label: "Người dùng & nhóm", href: "/admin", icon: UsersRound, roles: ["ADMIN", "MANAGER"] },
  { label: "Kiểm tra điểm danh", href: "/attendance", icon: FileCheck2, roles: ["ADMIN", "MANAGER"] },
  { label: "Nhật ký sinh viên", href: "/journal", icon: BookOpenText, roles: ["ADMIN", "MANAGER"] },
  { label: "Ca & sức chứa", href: "/admin/shifts", icon: Database, roles: ["ADMIN", "MANAGER"] },
  { label: "Chính sách thực tập", href: "/team", icon: SlidersHorizontal, roles: ["ADMIN", "MANAGER"] },
  { label: "Báo cáo", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const visibleItems = navItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isLeader = user?.role === "TEAM_LEADER";
  const workspaceLabel = isAdmin ? "Khu quản trị" : isLeader ? "Khu nhóm trưởng" : "Khu sinh viên";
  const policyText = isAdmin
    ? "Quản lý người dùng, ca, sức chứa, báo cáo và kiểm tra điểm danh."
    : isLeader
      ? "Nhóm trưởng là sinh viên thực tập: tối đa 3 ca/ngày, 9 ca/tuần và quản lý các bạn trùng ca."
      : "Sinh viên thường 6 buổi/tuần. Đủ 6 ca tối sẽ được cộng 1 ca bonus.";

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,calc(100vw-1.5rem))] max-w-full flex-col border-r bg-white px-4 py-5 shadow-2xl transition-transform lg:static lg:w-72 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white">
              IF
            </div>
            <div>
              <p className="text-sm font-semibold">InternFlow</p>
              <p className="text-xs text-muted-foreground">{workspaceLabel}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="Đóng menu">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-lg border bg-slate-50 p-4">
          <p className="text-sm font-medium">Quy định thực tập</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{policyText}</p>
        </div>
      </aside>
    </>
  );
}
