import { Bell, LogOut, Menu, Search, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { parseDisplayDateToIso } from "@/utils/date-format";

type TopNavbarProps = {
  onMenuClick: () => void;
};

export function TopNavbar({ onMenuClick }: TopNavbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [searchType, setSearchType] = useState(isAdmin ? "studentCode" : "scheduleDate");
  const [keyword, setKeyword] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = keyword.trim();
    if (!query) return;
    setMobileSearchOpen(false);

    if (isAdmin) {
      navigate(`/admin?searchType=${searchType}&q=${encodeURIComponent(query)}`);
      return;
    }

    const date = parseDisplayDateToIso(query);
    if (searchType === "attendanceDate") {
      navigate(date ? `/attendance?date=${date}` : `/attendance?q=${encodeURIComponent(query)}`);
      return;
    }
    navigate(date ? `/schedule?date=${date}` : `/schedule?q=${encodeURIComponent(query)}`);
  };

  const renderSearchControls = () => (
    <>
      <select
        className="h-10 min-w-0 rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-44"
        value={searchType}
        onChange={(event) => setSearchType(event.target.value)}
      >
        {isAdmin ? (
          <>
            <option value="studentCode">Mã sinh viên</option>
            <option value="studentName">Tên sinh viên</option>
            <option value="email">Email</option>
            <option value="class">Lớp</option>
            <option value="cohortCode">Mã khóa</option>
            <option value="cohortName">Tên khóa</option>
          </>
        ) : (
          <>
            <option value="scheduleDate">Lịch của tôi</option>
            <option value="attendanceDate">Điểm danh của tôi</option>
          </>
        )}
      </select>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="bg-white pl-9"
          placeholder={isAdmin ? "Nhập mã sinh viên, tên, lớp, khóa..." : "Nhập ngày dạng 13-05-2026"}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </div>
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 px-3 py-2 backdrop-blur-xl sm:px-4 lg:px-8">
      <div className="flex min-h-12 w-full items-center gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Mở menu">
          <Menu className="h-5 w-5" />
        </Button>

        <form className="relative hidden min-w-0 flex-1 items-center gap-2 md:flex" onSubmit={submitSearch}>
          {renderSearchControls()}
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileSearchOpen((open) => !open)}
            aria-label={mobileSearchOpen ? "Đóng tìm kiếm" : "Mở tìm kiếm"}
          >
            {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10 sm:h-[3.25rem] sm:w-[3.25rem]" aria-label="Thông báo">
            <Bell className="h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
          <div className="hidden max-w-[220px] items-center gap-3 rounded-lg border bg-white px-3 py-2 sm:flex">
            <div className="h-8 w-8 shrink-0 rounded-md bg-slate-950 text-center text-xs font-semibold leading-8 text-white">
              {user?.fullName.slice(0, 2).toUpperCase() ?? "IF"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <Badge tone="muted" className="mt-1 px-2 py-0.5">
                {user?.role}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-[3.25rem] sm:w-[3.25rem]" onClick={logout} aria-label="Đăng xuất">
            <LogOut className="h-4 w-4 sm:h-6 sm:w-6" />
          </Button>
        </div>
      </div>

      <form className={cn("w-full gap-2 pb-2 pt-2 md:hidden", mobileSearchOpen ? "grid" : "hidden")} onSubmit={submitSearch}>
        {renderSearchControls()}
        <Button type="submit" className="w-full">
          Tìm kiếm
        </Button>
      </form>
    </header>
  );
}
