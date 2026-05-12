import { NavLink } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
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
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", href: "/attendance", icon: ClipboardCheck },
  { label: "Schedule", href: "/schedule", icon: CalendarDays },
  { label: "Team", href: "/team", icon: UsersRound, roles: ["TEAM_LEADER", "ADMIN", "MANAGER"] },
  { label: "Admin", href: "/admin", icon: ShieldCheck, roles: ["ADMIN", "MANAGER"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER"] },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
  const visibleItems = navItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <>
      <div
        className={cn("fixed inset-0 z-40 bg-slate-950/30 lg:hidden", open ? "block" : "hidden")}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-white px-4 py-5 transition-transform lg:static lg:translate-x-0",
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
              <p className="text-xs text-muted-foreground">Shift workspace</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  isActive && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white",
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-lg border bg-slate-50 p-4">
          <p className="text-sm font-medium">Quota policy</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Interns max 2 shifts per day. Team leaders max 3. Each shift allows up to 9 people.
          </p>
        </div>
      </aside>
    </>
  );
}
