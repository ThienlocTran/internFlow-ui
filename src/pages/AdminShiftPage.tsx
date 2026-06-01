import { useMemo, useState } from "react";
import { Edit3, Loader2, Plus, Power, RefreshCw, Save, Search, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { createShift, getAdminShifts, updateShift, updateShiftActive } from "@/services/shift.service";
import type { Shift, ShiftPayload } from "@/types/api";

type ShiftForm = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  category: "COMPANY" | "HOME_REPORT";
  maxParticipants: string;
  shiftOrder: string;
  displayGroup: string;
  nightShift: boolean;
  active: boolean;
};

const emptyForm: ShiftForm = {
  code: "",
  name: "",
  startTime: "08:00",
  endTime: "11:30",
  category: "COMPANY",
  maxParticipants: "9",
  shiftOrder: "1",
  displayGroup: "Ban ngày",
  nightShift: false,
  active: true,
};

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function timeInputValue(value: string) {
  return value?.slice(0, 5) || "";
}

function displayGroupFor(shift: Shift) {
  if (shift.displayGroup) return shift.displayGroup;
  if (shift.category === "HOME_REPORT") return "Báo cáo tại nhà";
  if (shift.shiftOrder >= 3) return "Buổi tối";
  return "Ban ngày";
}

function isNightShift(shift: Shift) {
  return Boolean(shift.nightShift ?? shift.isNightShift ?? shift.shiftOrder >= 3);
}

function toForm(shift: Shift): ShiftForm {
  return {
    code: shift.code,
    name: shift.name,
    startTime: timeInputValue(shift.startTime),
    endTime: timeInputValue(shift.endTime),
    category: shift.category,
    maxParticipants: String(shift.maxParticipants),
    shiftOrder: String(shift.shiftOrder),
    displayGroup: displayGroupFor(shift),
    nightShift: isNightShift(shift),
    active: shift.active,
  };
}

function toPayload(form: ShiftForm): ShiftPayload {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    startTime: normalizeTime(form.startTime),
    endTime: normalizeTime(form.endTime),
    category: form.category,
    maxParticipants: Number(form.maxParticipants),
    shiftOrder: Number(form.shiftOrder),
    displayGroup: form.displayGroup.trim() || undefined,
    isNightShift: form.nightShift,
    active: form.active,
  };
}

function validate(form: ShiftForm) {
  if (!form.code.trim()) return "Vui lòng nhập mã ca.";
  if (!form.name.trim()) return "Vui lòng nhập tên ca.";
  if (!form.startTime || !form.endTime) return "Vui lòng nhập giờ bắt đầu và kết thúc.";
  if (form.startTime >= form.endTime) return "Giờ kết thúc phải sau giờ bắt đầu.";
  if (!Number.isInteger(Number(form.maxParticipants)) || Number(form.maxParticipants) < 0) {
    return "Số slot phải là số nguyên không âm.";
  }
  if (!Number.isInteger(Number(form.shiftOrder)) || Number(form.shiftOrder) < 0) {
    return "Thứ tự ca phải là số nguyên không âm.";
  }
  return null;
}

export function AdminShiftPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [form, setForm] = useState<ShiftForm>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const shiftsQuery = useQuery({ queryKey: ["admin-shifts"], queryFn: getAdminShifts });

  const resetForm = () => {
    setEditingShiftId(null);
    setForm(emptyForm);
    setFormError(null);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingShiftId(null);
    setForm(emptyForm);
    setFormError(null);
    setMessage(null);
    setIsFormOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const error = validate(form);
      if (error) throw new Error(error);
      const payload = toPayload(form);
      return editingShiftId ? updateShift(editingShiftId, payload) : createShift(payload);
    },
    onSuccess: () => {
      setMessage(editingShiftId ? "Đã cập nhật ca." : "Đã tạo ca mới.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (error) => {
      setFormError(error instanceof Error ? error.message : "Không lưu được ca. Vui lòng thử lại.");
    },
  });

  const activeMutation = useMutation({
    mutationFn: ({ shiftId, active }: { shiftId: string; active: boolean }) => updateShiftActive(shiftId, active),
    onSuccess: () => {
      setMessage("Đã cập nhật trạng thái ca.");
      queryClient.invalidateQueries({ queryKey: ["admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (error) => {
      setMessage(error instanceof Error ? error.message : "Không đổi được trạng thái ca.");
    },
  });

  const shifts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return (shiftsQuery.data ?? [])
      .filter((shift) => {
        if (!keyword) return true;
        return [shift.code, shift.name, displayGroupFor(shift)].some((value) => value.toLowerCase().includes(keyword));
      })
      .sort((a, b) => a.shiftOrder - b.shiftOrder || a.startTime.localeCompare(b.startTime));
  }, [query, shiftsQuery.data]);

  const beginEdit = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setForm(toForm(shift));
    setFormError(null);
    setMessage(null);
    setIsFormOpen(true);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Quản lý ca</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tạo, sửa và bật/tắt ca thực tập dùng cho lịch đăng ký.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Tạo ca
          </Button>
          <Button variant="outline" onClick={() => shiftsQuery.refetch()} disabled={shiftsQuery.isFetching}>
          <RefreshCw className="h-4 w-4" />
          Tải lại
          </Button>
        </div>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <div className={isFormOpen ? "grid gap-6 xl:grid-cols-[420px_1fr]" : "grid gap-6"}>
        {isFormOpen && <Card className="bg-white/90">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="space-y-1.5">
            <CardTitle>{editingShiftId ? "Sửa ca" : "Tạo ca"}</CardTitle>
            <CardDescription>Điền thông tin ca, slot, nhóm hiển thị và trạng thái hoạt động.</CardDescription>
            </div>
            <Button size="icon" variant="ghost" onClick={resetForm} disabled={saveMutation.isPending} aria-label="Đóng form">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Mã ca
                <Input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="SHIFT_1" />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Thứ tự
                <Input type="number" min="0" value={form.shiftOrder} onChange={(event) => setForm((current) => ({ ...current, shiftOrder: event.target.value }))} />
              </label>
            </div>

            <label className="space-y-1 text-sm font-medium">
              Tên ca
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ca 1" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Bắt đầu
                <Input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Kết thúc
                <Input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} />
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Slot tối đa
                <Input type="number" min="0" value={form.maxParticipants} onChange={(event) => setForm((current) => ({ ...current, maxParticipants: event.target.value }))} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                Loại ca
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as ShiftForm["category"] }))}
                >
                  <option value="COMPANY">Tại công ty</option>
                  <option value="HOME_REPORT">Báo cáo tại nhà</option>
                </select>
              </label>
            </div>

            <label className="space-y-1 text-sm font-medium">
              Nhóm ca
              <Input value={form.displayGroup} onChange={(event) => setForm((current) => ({ ...current, displayGroup: event.target.value }))} placeholder="Ban ngày / Buổi tối" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm font-medium">
                <input type="checkbox" checked={form.nightShift} onChange={(event) => setForm((current) => ({ ...current, nightShift: event.target.checked }))} />
                Ca tối
              </label>
              <label className="flex items-center gap-3 rounded-lg border bg-white p-3 text-sm font-medium">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
                Đang mở
              </label>
            </div>

            {formError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingShiftId ? "Lưu thay đổi" : "Tạo ca"}
              </Button>
              {editingShiftId && (
                <Button variant="outline" onClick={resetForm} disabled={saveMutation.isPending}>
                  <X className="h-4 w-4" />
                  Hủy
                </Button>
              )}
            </div>
          </CardContent>
        </Card>}

        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <CardTitle>Danh sách ca</CardTitle>
                <CardDescription>Admin chỉnh cấu hình ca; rule đăng ký xử lý ở task khác.</CardDescription>
              </div>
              <label className="flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm md:w-72">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Tìm mã, tên, nhóm" value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {shiftsQuery.isLoading && (
              <div className="flex min-h-64 items-center justify-center">
                <LoadingSpinner className="h-8 w-8" />
              </div>
            )}

            {shiftsQuery.error && <ErrorState message="Không tải được danh sách ca từ backend." />}

            {!shiftsQuery.isLoading && !shiftsQuery.error && shifts.length === 0 && (
              <EmptyState icon={Plus} title="Chưa có ca" description="Tạo ca đầu tiên để sinh viên có lịch đăng ký." />
            )}

            {!shiftsQuery.isLoading && !shiftsQuery.error && shifts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 font-medium">Ca</th>
                      <th className="py-3 font-medium">Thời gian</th>
                      <th className="py-3 font-medium">Slot</th>
                      <th className="py-3 font-medium">Nhóm</th>
                      <th className="py-3 font-medium">Thứ tự</th>
                      <th className="py-3 font-medium">Trạng thái</th>
                      <th className="py-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((shift) => (
                      <tr key={shift.id} className="border-b last:border-0">
                        <td className="py-4">
                          <p className="font-medium">{shift.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{shift.code}</p>
                        </td>
                        <td className="py-4">{timeInputValue(shift.startTime)} - {timeInputValue(shift.endTime)}</td>
                        <td className="py-4">{shift.maxParticipants}</td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge tone="muted">{displayGroupFor(shift)}</Badge>
                            {isNightShift(shift) && <Badge tone="warning">Ca tối</Badge>}
                          </div>
                        </td>
                        <td className="py-4">{shift.shiftOrder}</td>
                        <td className="py-4">
                          <Badge tone={shift.active ? "success" : "muted"}>{shift.active ? "Đang mở" : "Đã tắt"}</Badge>
                        </td>
                        <td className="py-4">
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => beginEdit(shift)}>
                              <Edit3 className="h-4 w-4" />
                              Sửa
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={activeMutation.isPending}
                              onClick={() => activeMutation.mutate({ shiftId: shift.id, active: !shift.active })}
                            >
                              <Power className="h-4 w-4" />
                              {shift.active ? "Tắt" : "Mở"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
