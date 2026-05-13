import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Database, Download, Info, Loader2, XCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getShifts } from "@/services/shift.service";
import { cancelSchedule, getScheduleCapacity, getUserSchedule, registerSchedule } from "@/services/schedule.service";
import { useAuthStore } from "@/store/auth-store";
import type { ScheduleCapacity, ScheduleRegistration, Shift } from "@/types/api";
import { downloadCsv } from "@/utils/export-csv";

const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function weekRange(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  const days = Array.from({ length: 7 }, (_, index) => {
    const item = new Date(monday);
    item.setDate(monday.getDate() + index);
    return item.toISOString().slice(0, 10);
  });
  return {
    start: days[0],
    end: days[6],
    days,
  };
}

function getShiftGroup(code: string) {
  if (code === "SHIFT_1" || code === "SHIFT_2") return "Ban ngày";
  if (code === "SHIFT_3" || code === "SHIFT_4") return "Buổi tối";
  return "Khác";
}

function shiftOrder(shift: Shift) {
  const value = Number(shift.code.split("_").at(-1));
  return Number.isFinite(value) ? value : 999;
}

function isAdjacent(shifts: Shift[]) {
  if (shifts.length <= 1) return true;
  const orders = [...shifts].map(shiftOrder).sort((a, b) => a - b);
  return orders[orders.length - 1] - orders[0] === orders.length - 1;
}

function capacityFor(capacities: ScheduleCapacity[] | undefined, date: string, shiftId: string) {
  return capacities?.find((item) => item.scheduleDate === date && item.shiftId === shiftId);
}

function registrationsForDay(registrations: ScheduleRegistration[] | undefined, date: string) {
  return (registrations ?? []).filter((item) => item.scheduleDate === date && item.status === "REGISTERED");
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
  const [searchParams] = useSearchParams();
  const initialDate = searchParams.get("date") ?? today();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);
  const range = weekRange(selectedDate);

  const shiftsQuery = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const scheduleQuery = useQuery({
    queryKey: ["schedule", user?.id, range.start, range.end],
    queryFn: () => getUserSchedule(user!.id, range.start, range.end),
    enabled: Boolean(user?.id),
  });
  const capacityQuery = useQuery({
    queryKey: ["schedule-capacity", range.start, range.end],
    queryFn: () => getScheduleCapacity(range.start, range.end),
  });

  const shifts = (shiftsQuery.data ?? []).slice().sort((a, b) => shiftOrder(a) - shiftOrder(b));
  const selectedShifts = useMemo(
    () => shifts.filter((shift) => selectedShiftIds.includes(shift.id)),
    [selectedShiftIds, shifts],
  );
  const dayRegistrations = registrationsForDay(scheduleQuery.data, selectedDate);
  const selectedDayShiftIds = new Set(dayRegistrations.map((item) => item.shift.id));
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
      setNotice({ type: "success", text: "Đã đăng ký ca thành công. Bạn chỉ có thể điểm danh các ca đã đăng ký." });
      setSelectedShiftIds([]);
      queryClient.invalidateQueries({ queryKey: ["schedule", user?.id, range.start, range.end] });
      queryClient.invalidateQueries({ queryKey: ["schedule-capacity", range.start, range.end] });
    },
    onError: (error) => {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể đăng ký ca." });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      setNotice({ type: "success", text: "Đã rời ca. Chỗ trống sẽ mở lại cho sinh viên khác." });
      queryClient.invalidateQueries({ queryKey: ["schedule", user?.id, range.start, range.end] });
      queryClient.invalidateQueries({ queryKey: ["schedule-capacity", range.start, range.end] });
    },
    onError: (error) => {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Không thể rời ca." });
    },
  });

  if (shiftsQuery.isLoading || scheduleQuery.isLoading || capacityQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (shiftsQuery.error || !shiftsQuery.data) {
    return <ErrorState message="Không tải được lịch ca từ backend." />;
  }

  const toggleShift = (shift: Shift) => {
    const capacity = capacityFor(capacityQuery.data, selectedDate, shift.id);
    if (capacity?.full) {
      setNotice({ type: "warning", text: `${shift.name} đã đủ ${capacity.maxParticipants} bạn. Hãy chọn ca khác hoặc đợi có bạn rời ca.` });
      return;
    }
    if (selectedDayShiftIds.has(shift.id)) {
      setNotice({ type: "warning", text: `Bạn đã đăng ký ${shift.name} trong ngày này rồi.` });
      return;
    }
    setSelectedShiftIds((current) =>
      current.includes(shift.id) ? current.filter((id) => id !== shift.id) : [...current, shift.id],
    );
  };

  const noticeClass =
    notice?.type === "error"
      ? "bg-red-50 text-red-700"
      : notice?.type === "warning"
        ? "bg-amber-50 text-amber-800"
        : "bg-emerald-50 text-emerald-700";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Lịch đăng ký</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chọn ngày trong tuần, sau đó chọn ca của ngày đó. Ca đủ 9 bạn sẽ tự khóa.
        </p>
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Tuần {formatDisplayDate(range.start)} - {formatDisplayDate(range.end)}</CardTitle>
          <CardDescription>Bạn có thể đăng ký linh động theo từng ngày, nhưng một ngày tối đa 2 ca liền kề.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-7">
          {range.days.map((date, index) => {
            const count = registrationsForDay(scheduleQuery.data, date).length;
            const selected = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                className={`rounded-lg border p-4 text-left transition ${
                  selected ? "border-slate-950 bg-slate-950 text-white shadow-sm" : "bg-white hover:bg-slate-50"
                }`}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedShiftIds([]);
                  setNotice(null);
                }}
              >
                <p className="text-sm font-semibold">{dayNames[index]}</p>
                <p className={selected ? "mt-1 text-sm text-slate-200" : "mt-1 text-sm text-muted-foreground"}>
                  {formatDisplayDate(date)}
                </p>
                <p className={selected ? "mt-3 text-xs text-slate-200" : "mt-3 text-xs text-muted-foreground"}>
                  {count} ca đã đăng ký
                </p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="overflow-hidden bg-white/90">
        <div className="border-b bg-slate-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Chọn ca cho {formatDisplayDate(selectedDate)}</CardTitle>
              <CardDescription>Ca 1 + Ca 2 hoặc Ca 3 + Ca 4 được xem là liền kề.</CardDescription>
            </div>
            <Badge tone="muted">Đã đăng ký hôm nay: {dayRegistrations.length}/2</Badge>
          </div>
        </div>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {shifts.map((shift) => {
              const selected = selectedShiftIds.includes(shift.id);
              const registered = selectedDayShiftIds.has(shift.id);
              const capacity = capacityFor(capacityQuery.data, selectedDate, shift.id);
              const full = Boolean(capacity?.full);
              const disabled = full || registered;
              return (
                <button
                  key={shift.id}
                  type="button"
                  disabled={disabled}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                  } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                  onClick={() => toggleShift(shift)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{shift.name}</p>
                    <Badge tone={full ? "warning" : registered ? "success" : "muted"}>
                      {full ? "Đủ chỗ" : registered ? "Đã đăng ký" : getShiftGroup(shift.code)}
                    </Badge>
                  </div>
                  <p className={selected ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm text-muted-foreground"}>
                    {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
                  </p>
                  <p className={selected ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm"}>
                    Đã đăng ký: {capacity?.registeredCount ?? 0}/{capacity?.maxParticipants ?? shift.maxParticipants}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedShiftIds.length > 2 && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              Bạn đang chọn quá 2 ca trong ngày. Hãy bỏ bớt một ca để tiếp tục.
            </p>
          )}
          {selectedShiftIds.length > 1 && !isAdjacent(selectedShifts) && (
            <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
              Hai ca này cách nhau quá xa. Hãy chọn Ca 1 + Ca 2 hoặc Ca 3 + Ca 4 để lịch dễ theo dõi hơn.
            </p>
          )}
          {notice && <p className={`rounded-md p-3 text-sm ${noticeClass}`}>{notice.text}</p>}

          <Button disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Đăng ký ca đã chọn
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Lịch đã đăng ký trong tuần</CardTitle>
          <CardDescription>
            Từ {range.start} đến {range.end}. Chỉ những ca đã đăng ký mới được điểm danh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduleQuery.data && scheduleQuery.data.filter((item) => item.status === "REGISTERED").length > 0 ? (
            scheduleQuery.data
              .filter((item) => item.status === "REGISTERED")
              .map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-4">
                  <div>
                    <p className="font-medium">
                      {item.scheduleDate} - {item.shift.name}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.shift.startTime.slice(0, 5)} - {item.shift.endTime.slice(0, 5)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="success">Đã đăng ký</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(item.id)}
                    >
                      <XCircle className="h-4 w-4" />
                      Rời ca
                    </Button>
                  </div>
                </div>
              ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Tuần này chưa có ca đăng ký</p>
              <p className="mt-1 text-sm text-muted-foreground">Chọn ngày ở lịch tuần, sau đó chọn ca để đăng ký.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Lưu ý</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Info className="h-4 w-4" />
              Chọn ca liền kề
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Ca 1 + Ca 2 hoặc Ca 3 + Ca 4 là lựa chọn chuẩn.</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="font-medium">Tối đa 2 ca/ngày</p>
            <p className="mt-2 text-sm text-muted-foreground">Nếu cần trường hợp đặc biệt, hãy báo admin trước.</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="font-medium">Ca đủ chỗ sẽ khóa</p>
            <p className="mt-2 text-sm text-muted-foreground">Khi có bạn rời ca, hệ thống sẽ mở lại chỗ trống.</p>
          </div>
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
