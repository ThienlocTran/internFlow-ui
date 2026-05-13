import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Database, Download, Info, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getShifts } from "@/services/shift.service";
import { getUserSchedule, registerSchedule } from "@/services/schedule.service";
import { useAuthStore } from "@/store/auth-store";
import type { Shift } from "@/types/api";
import { downloadCsv } from "@/utils/export-csv";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function weekRange(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

function getShiftGroup(code: string) {
  if (code === "SHIFT_1" || code === "SHIFT_2") return "Ban ngày";
  if (code === "SHIFT_3" || code === "SHIFT_4") return "Buổi tối";
  return "Khác";
}

function isAdjacent(shifts: Shift[]) {
  if (shifts.length <= 1) return true;
  const sorted = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return sorted.every((shift, index) => index === 0 || sorted[index - 1].endTime === shift.startTime);
}

function AdminShiftCapacityPage() {
  const shiftsQuery = useQuery({ queryKey: ["shifts"], queryFn: getShifts });

  if (shiftsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (shiftsQuery.error || !shiftsQuery.data) {
    return <ErrorState message="Không tải được danh sách ca từ backend." />;
  }

  const shifts = shiftsQuery.data;
  const exportShifts = () => {
    downloadCsv(
      "internflow-shifts.csv",
      ["Mã ca", "Tên ca", "Bắt đầu", "Kết thúc", "Nhóm", "Sức chứa", "Trạng thái"],
      shifts.map((shift) => [
        shift.code,
        shift.name,
        shift.startTime.slice(0, 5),
        shift.endTime.slice(0, 5),
        getShiftGroup(shift.code),
        shift.maxParticipants,
        shift.active ? "Đang mở" : "Tắt",
      ]),
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Ca & sức chứa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Admin theo dõi cấu hình ca. Sinh viên đăng ký ca ở giao diện sinh viên riêng.
          </p>
        </div>
        <Button variant="outline" onClick={exportShifts}>
          <Download className="h-4 w-4" />
          Xuất danh sách ca
        </Button>
      </div>

      <Card className="overflow-hidden bg-white/90">
        <div className="border-b bg-slate-950 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/10 p-3">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Khung ca hiện tại</CardTitle>
              <CardDescription className="text-slate-300">Mỗi ca đang giới hạn tối đa 9 sinh viên.</CardDescription>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {shifts.map((shift) => (
            <div key={shift.id} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{shift.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{shift.code}</p>
                </div>
                <Badge tone={shift.active ? "success" : "muted"}>{shift.active ? "Mở" : "Tắt"}</Badge>
              </div>
              <div className="mt-5 rounded-md bg-slate-50 p-3">
                <p className="text-2xl font-semibold">
                  {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{getShiftGroup(shift.code)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-md border p-3">
                <span className="text-sm text-muted-foreground">Sức chứa</span>
                <span className="font-semibold">{shift.maxParticipants} bạn</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function InternSchedulePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const range = weekRange(selectedDate);

  const shiftsQuery = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const scheduleQuery = useQuery({
    queryKey: ["schedule", user?.id, range.start, range.end],
    queryFn: () => getUserSchedule(user!.id, range.start, range.end),
    enabled: Boolean(user?.id),
  });

  const shifts = shiftsQuery.data ?? [];
  const selectedShifts = useMemo(
    () => shifts.filter((shift) => selectedShiftIds.includes(shift.id)),
    [selectedShiftIds, shifts],
  );
  const canSubmit = selectedShiftIds.length > 0 && selectedShiftIds.length <= 2 && isAdjacent(selectedShifts);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error("Bạn cần đăng nhập trước.");
      return registerSchedule({
        userId: user.id,
        scheduleDate: selectedDate,
        shiftIds: selectedShiftIds,
      });
    },
    onSuccess: () => {
      setMessage("Đăng ký ca thành công.");
      setErrorMessage(null);
      setSelectedShiftIds([]);
      queryClient.invalidateQueries({ queryKey: ["schedule", user?.id, range.start, range.end] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể đăng ký ca.");
    },
  });

  if (shiftsQuery.isLoading || scheduleQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (shiftsQuery.error || !shiftsQuery.data) {
    return <ErrorState message="Không tải được lịch ca từ backend." />;
  }

  const toggleShift = (shiftId: string) => {
    setSelectedShiftIds((current) =>
      current.includes(shiftId) ? current.filter((id) => id !== shiftId) : [...current, shiftId],
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Lịch đăng ký</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sinh viên chọn trước ca muốn đi để công ty kiểm soát sức chứa và tránh quá đông một ca.
        </p>
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Nguyên tắc chọn ca</CardTitle>
          <CardDescription>Áp dụng khi sinh viên đăng ký lịch tuần.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4" />
              Chọn ca liền kề
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Sinh viên thường chọn 1 hoặc 2 ca liền nhau, ví dụ Ca 1 + Ca 2 hoặc Ca 3 + Ca 4.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="font-medium">Tối đa 2 ca/ngày</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Hệ thống sẽ chặn nếu đăng ký vượt quota role hoặc ca đã đủ 9 bạn.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="font-medium">Bonus ca tối</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Cứ đủ 6 ca tối thì được cộng thêm 1 ca thực tập bonus.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Đăng ký ca</CardTitle>
          <CardDescription>Chọn ngày và ca muốn tham gia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {shifts.map((shift) => {
              const selected = selectedShiftIds.includes(shift.id);
              return (
                <button
                  key={shift.id}
                  type="button"
                  className={`rounded-lg border p-4 text-left transition ${
                    selected ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                  }`}
                  onClick={() => toggleShift(shift.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{shift.name}</p>
                    <Badge tone="muted">{getShiftGroup(shift.code)}</Badge>
                  </div>
                  <p className={selected ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm text-muted-foreground"}>
                    {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                  </p>
                  <p className={selected ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm"}>
                    Sức chứa: {shift.maxParticipants} bạn
                  </p>
                </button>
              );
            })}
          </div>

          {selectedShiftIds.length > 2 && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Sinh viên thường chỉ được chọn tối đa 2 ca/ngày.</p>
          )}
          {selectedShiftIds.length > 1 && !isAdjacent(selectedShifts) && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-700">Nên chọn các ca liền kề nhau trong cùng ngày.</p>
          )}
          {(message || errorMessage) && (
            <p className={errorMessage ? "rounded-md bg-red-50 p-3 text-sm text-red-700" : "rounded-md bg-emerald-50 p-3 text-sm text-emerald-700"}>
              {errorMessage ?? message}
            </p>
          )}

          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Đăng ký ca
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Lịch đã đăng ký trong tuần</CardTitle>
          <CardDescription>
            Từ {range.start} đến {range.end}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduleQuery.data && scheduleQuery.data.length > 0 ? (
            scheduleQuery.data.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
                <div>
                  <p className="font-medium">
                    {item.scheduleDate} - {item.shift.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.shift.startTime.slice(0, 5)} - {item.shift.endTime.slice(0, 5)}
                  </p>
                </div>
                <Badge tone="success">Đã đăng ký</Badge>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Tuần này chưa có ca đăng ký</p>
              <p className="mt-1 text-sm text-muted-foreground">Chọn ngày và ca ở phía trên để đăng ký.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SchedulePage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  return isAdmin ? <AdminShiftCapacityPage /> : <InternSchedulePage />;
}
