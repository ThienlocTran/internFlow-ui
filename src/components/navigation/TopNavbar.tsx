import { Bell, LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";

type TopNavbarProps = {
  onMenuClick: () => void;
};

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { user, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/85 px-4 backdrop-blur-xl lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open sidebar">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="relative hidden flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="max-w-md bg-white pl-9" placeholder="Search attendance, teams, reports..." />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="hidden items-center gap-3 rounded-lg border bg-white px-3 py-2 sm:flex">
          <div className="h-8 w-8 rounded-md bg-slate-950 text-center text-xs font-semibold leading-8 text-white">
            {user?.fullName.slice(0, 2).toUpperCase() ?? "IF"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.fullName}</p>
            <Badge tone="muted" className="mt-1 px-2 py-0.5">
              {user?.role}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
