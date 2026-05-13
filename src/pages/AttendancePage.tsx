import { useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Clock3, Eye, ImageUp, Loader2, UploadCloud } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ErrorState } from "@/components/common/ErrorState";
import { getShifts } from "@/services/shift.service";
import { addAttendanceImage, checkin, checkout, getAttendances } from "@/services/attendance.service";
import { uploadImage } from "@/services/upload.service";
import { getCohorts, getCohortStudents, getStudentDetail } from "@/services/cohort.service";
import { useAuthStore } from "@/store/auth-store";
import type { Attendance, AttendanceImagePhase, AttendanceImageType, Shift } from "@/types/api";
import { getGroupPhotoSlots, getPersonalIntervalSlots } from "@/utils/attendance-photo-rules";
import { downloadCsv } from "@/utils/export-csv";

type SlotKey = "checkin-personal" | "checkin-group" | "checkout-personal" | "checkout-group" | string;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fileKey(type: AttendanceImageType, phase: AttendanceImagePhase, time: string) {
  return `${type}-${phase}-${time}`;
}

function selectedAttendance(attendances: Attendance[] | undefined, shiftId: string | null) {
  return attendances?.find((attendance) => attendance.shift.id === shiftId);
}

function ImagePicker({
  label,
  hint,
  file,
  onChange,
}: {
  label: string;
  hint?: string;
  file?: File;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <label className="block rounded-lg border border-dashed bg-slate-50 p-4 transition-colors hover:bg-slate-100">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-white p-2 text-slate-700 shadow-sm">
          <UploadCloud className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>}
          <p className="mt-2 truncate text-xs text-slate-600">{file ? file.name : "Chọn ảnh từ máy"}</p>
        </div>
      </div>
      <Input
        className="sr-only"
        type="file"
        accept="image/*"
        onChange={(event) => onChange(event.target.files?.[0])}
      />
    </label>
  );
}

function AdminAttendanceReviewPage() {
  const [selectedCohortId, setSelectedCohortId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const cohortsQuery = useQuery({ queryKey: ["cohorts"], queryFn: getCohorts });
  const studentsQuery = useQuery({
    queryKey: ["cohort-students", selectedCohortId],
    queryFn: () => getCohortStudents(selectedCohortId),
    enabled: Boolean(selectedCohortId),
  });
  const detailQuery = useQuery({
    queryKey: ["student-detail", selectedStudentId],
    queryFn: () => getStudentDetail(selectedStudentId!),
    enabled: Boolean(selectedStudentId),
  });

  if (cohortsQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (cohortsQuery.error || !cohortsQuery.data) {
    return <ErrorState message="Không tải được danh sách khóa thực tập." />;
  }

  const students = studentsQuery.data ?? [];
  const exportAttendanceAudit = () => {
    if (!detailQuery.data) return;
    downloadCsv(
      `diem-danh-${detailQuery.data.student.fullName}.csv`,
      ["Ngày", "Ca", "Ảnh cá nhân", "Thiếu ảnh cá nhân", "Ảnh nhóm", "Thiếu ảnh nhóm", "Trang báo cáo", "Thiếu báo cáo"],
      detailQuery.data.attendances.map((item) => [
        item.attendanceDate,
        item.shiftName,
        `${item.uploadedPersonalImages}/${item.requiredPersonalImages}`,
        item.missingPersonalImages,
        `${item.uploadedGroupImages}/${item.requiredGroupImages}`,
        item.missingGroupImages,
        `${item.submittedReportPages}/${item.requiredReportPages}`,
        item.enoughReportPages ? "Không" : "Có",
      ]),
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Kiểm tra điểm danh</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Admin chỉ xem và kiểm tra minh chứng. Upload ảnh thuộc về sinh viên.
        </p>
      </div>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Chọn khóa cần kiểm tra</CardTitle>
          <CardDescription>Lọc sinh viên theo khóa thực tập để tránh lẫn dữ liệu giữa các đợt.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cohortsQuery.data.map((cohort) => (
            <button
              key={cohort.id}
              type="button"
              className={`rounded-lg border p-4 text-left transition ${
                selectedCohortId === cohort.id ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
              }`}
              onClick={() => {
                setSelectedCohortId(cohort.id);
                setSelectedStudentId(null);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{cohort.name}</p>
                <Badge tone={cohort.active ? "success" : "muted"}>{cohort.active ? "Đang mở" : "Đã đóng"}</Badge>
              </div>
              <p className={selectedCohortId === cohort.id ? "mt-2 text-sm text-slate-200" : "mt-2 text-sm text-muted-foreground"}>
                {cohort.code} · {cohort.startDate}
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {selectedCohortId && (
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Sinh viên trong khóa</CardTitle>
            <CardDescription>Bấm chi tiết để xem từng buổi, ảnh đã nộp và cảnh báo thiếu minh chứng.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {studentsQuery.isLoading ? (
              <div className="flex min-h-32 items-center justify-center">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 font-medium">Họ tên</th>
                    <th className="py-3 font-medium">Email</th>
                    <th className="py-3 font-medium">MSSV</th>
                    <th className="py-3 font-medium">Lớp</th>
                    <th className="py-3 font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b last:border-0">
                      <td className="py-4 font-medium">{student.fullName}</td>
                      <td className="py-4 text-muted-foreground">{student.email}</td>
                      <td className="py-4">{student.studentCode || "Chưa có"}</td>
                      <td className="py-4">{student.studentClass || "Chưa có"}</td>
                      <td className="py-4">
                        <Button size="sm" variant="outline" onClick={() => setSelectedStudentId(student.id)}>
                          <Eye className="h-4 w-4" />
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {selectedStudentId && (
        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Chi tiết minh chứng</CardTitle>
                <CardDescription>Thuật toán kiểm tra số ảnh theo ca và 8 trang báo cáo mỗi ca.</CardDescription>
              </div>
              <Button variant="outline" disabled={!detailQuery.data} onClick={exportAttendanceAudit}>
                Xuất CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {detailQuery.isLoading && (
              <div className="flex min-h-32 items-center justify-center">
                <LoadingSpinner className="h-7 w-7" />
              </div>
            )}
            {detailQuery.data && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Sinh viên</p>
                    <p className="mt-1 font-semibold">{detailQuery.data.student.fullName}</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Đã hoàn thành</p>
                    <p className="mt-1 font-semibold">{detailQuery.data.completedCompanyShifts} ca</p>
                  </div>
                  <div className="rounded-lg border bg-slate-50 p-4">
                    <p className="text-sm text-muted-foreground">Còn thiếu</p>
                    <p className="mt-1 font-semibold">{detailQuery.data.remainingCompanyShifts} ca</p>
                  </div>
                </div>

                {detailQuery.data.attendances.map((attendance) => (
                  <div key={attendance.attendanceId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {attendance.attendanceDate} · {attendance.shiftName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Cá nhân {attendance.uploadedPersonalImages}/{attendance.requiredPersonalImages} · Nhóm{" "}
                          {attendance.uploadedGroupImages}/{attendance.requiredGroupImages} · Báo cáo{" "}
                          {attendance.submittedReportPages}/{attendance.requiredReportPages} trang
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={attendance.enoughImages ? "success" : "warning"}>
                          {attendance.enoughImages ? "Đủ ảnh" : "Thiếu ảnh"}
                        </Badge>
                        <Badge tone={attendance.enoughReportPages ? "success" : "warning"}>
                          {attendance.enoughReportPages ? "Đủ báo cáo" : "Thiếu báo cáo"}
                        </Badge>
                      </div>
                    </div>
                    {(!attendance.enoughImages || !attendance.enoughReportPages) && (
                      <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4" />
                        <span>
                          Thiếu {attendance.missingPersonalImages} ảnh cá nhân, {attendance.missingGroupImages} ảnh nhóm và{" "}
                          {Math.max(0, attendance.requiredReportPages - attendance.submittedReportPages)} trang báo cáo.
                        </span>
                      </div>
                    )}
                    {attendance.images.length > 0 && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {attendance.images.map((image) => (
                          <a key={image.id} href={image.imageUrl} target="_blank" rel="noreferrer" className="group block">
                            <img
                              src={image.imageUrl}
                              alt={`${image.imageType} ${image.expectedTime}`}
                              className="aspect-video w-full rounded-md border object-cover transition group-hover:opacity-80"
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              {image.imageType} · {image.expectedTime}
                            </p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InternAttendancePage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const attendanceDate = today();
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<SlotKey, File | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shiftsQuery = useQuery({ queryKey: ["shifts"], queryFn: getShifts });
  const attendancesQuery = useQuery({
    queryKey: ["attendances", user?.id, attendanceDate],
    queryFn: () => getAttendances(user!.id, attendanceDate),
    enabled: Boolean(user?.id),
  });

  const shifts = shiftsQuery.data ?? [];
  const selectedShift = useMemo(
    () => shifts.find((shift) => shift.id === selectedShiftId) ?? shifts[0],
    [selectedShiftId, shifts],
  );
  const currentAttendance = selectedAttendance(attendancesQuery.data, selectedShift?.id ?? null);
  const personalSlots = selectedShift ? getPersonalIntervalSlots(selectedShift) : [];
  const groupSlots = selectedShift ? getGroupPhotoSlots(selectedShift) : [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedShift) throw new Error("Bạn cần đăng nhập và chọn ca.");
      const checkinPersonal = files["checkin-personal"];
      if (!checkinPersonal) throw new Error("Ảnh TimeMark vào ca là bắt buộc.");

      const timemarkUpload = await uploadImage(checkinPersonal);
      const groupFile = files["checkin-group"];
      const groupUpload = groupFile ? await uploadImage(groupFile) : undefined;

      return checkin({
        userId: user.id,
        shiftId: selectedShift.id,
        attendanceDate,
        timemarkImageUrl: timemarkUpload.url,
        groupImageUrl: groupUpload?.url,
      });
    },
    onSuccess: () => {
      setMessage("Checkin thành công.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể checkin.");
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!currentAttendance) throw new Error("Bạn cần checkin ca này trước.");
      const checkoutPersonal = files["checkout-personal"];
      if (!checkoutPersonal) throw new Error("Ảnh TimeMark tan ca là bắt buộc.");

      const timemarkUpload = await uploadImage(checkoutPersonal);
      const groupFile = files["checkout-group"];
      const groupUpload = groupFile ? await uploadImage(groupFile) : undefined;

      return checkout(currentAttendance.id, {
        timemarkImageUrl: timemarkUpload.url,
        groupImageUrl: groupUpload?.url,
      });
    },
    onSuccess: () => {
      setMessage("Checkout thành công.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể checkout.");
    },
  });

  const uploadSlotMutation = useMutation({
    mutationFn: async ({
      key,
      imageType,
      phase,
      expectedTime,
      displayOrder,
    }: {
      key: SlotKey;
      imageType: AttendanceImageType;
      phase: AttendanceImagePhase;
      expectedTime: string;
      displayOrder: number;
    }) => {
      if (!currentAttendance) throw new Error("Bạn cần checkin trước khi nộp ảnh giữa giờ.");
      const file = files[key];
      if (!file) throw new Error("Chưa chọn ảnh.");
      const uploaded = await uploadImage(file);
      return addAttendanceImage(currentAttendance.id, {
        imageType,
        phase,
        expectedTime,
        imageUrl: uploaded.url,
        displayOrder,
      });
    },
    onSuccess: () => {
      setMessage("Đã lưu ảnh theo mốc thời gian.");
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["attendances", user?.id, attendanceDate] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Không thể upload ảnh.");
    },
  });

  if (shiftsQuery.isLoading || attendancesQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (shiftsQuery.error || !shiftsQuery.data) {
    return <ErrorState message="Không tải được danh sách ca từ backend." />;
  }

  const setFile = (key: SlotKey, file: File | undefined) => {
    setFiles((current) => ({ ...current, [key]: file }));
  };

  const isBusy = saveMutation.isPending || checkoutMutation.isPending || uploadSlotMutation.isPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Điểm danh</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chọn ca, upload ảnh từ máy, hệ thống sẽ đẩy ảnh lên Cloudinary và lưu đúng mốc điểm danh.
        </p>
      </div>

      <Card className="border-slate-200 bg-white/90">
        <CardHeader>
          <CardTitle>Cơ chế nộp ảnh cho sinh viên mới</CardTitle>
          <CardDescription>Nên đọc kỹ trước khi điểm danh để tránh thiếu minh chứng cuối ca.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Clock3 className="h-4 w-4" />
              Ảnh vào ca và tan ca
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ảnh TimeMark đầu ca dùng để checkin, ảnh TimeMark cuối ca dùng để checkout.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <ImageUp className="h-4 w-4" />
              Ảnh cá nhân TimeMark
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Giữa ca cứ mỗi 30 phút upload 1 ảnh TimeMark. Mốc đầu ca và cuối ca không tính ở phần giữa giờ.
            </p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="flex items-center gap-2 font-medium">
              <Camera className="h-4 w-4" />
              Ảnh nhóm
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ảnh nhóm có mốc vào ca, mỗi 1 tiếng giữa ca và tan ca. Nếu đi một mình có thể bỏ qua ảnh nhóm.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Chọn ca hôm nay</CardTitle>
          <CardDescription>Ngày điểm danh: {attendanceDate}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {shifts.map((shift) => (
            <button
              key={shift.id}
              type="button"
              className={`rounded-lg border p-4 text-left transition ${
                selectedShift?.id === shift.id ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
              }`}
              onClick={() => setSelectedShiftId(shift.id)}
            >
              <p className="font-semibold">{shift.name}</p>
              <p className={selectedShift?.id === shift.id ? "mt-1 text-sm text-slate-200" : "mt-1 text-sm text-muted-foreground"}>
                {shift.startTime.slice(0, 5)} - {shift.endTime.slice(0, 5)}
              </p>
              <p className={selectedShift?.id === shift.id ? "mt-2 text-xs text-slate-200" : "mt-2 text-xs text-muted-foreground"}>
                Tối đa {shift.maxParticipants} bạn
              </p>
            </button>
          ))}
        </CardContent>
      </Card>

      {selectedShift && (
        <Card className="bg-white/90">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Form điểm danh {selectedShift.name}</CardTitle>
                <CardDescription>
                  {selectedShift.startTime.slice(0, 5)} - {selectedShift.endTime.slice(0, 5)}
                </CardDescription>
              </div>
              <Badge tone={currentAttendance?.status === "CHECKED_OUT" ? "success" : currentAttendance ? "warning" : "muted"}>
                {currentAttendance?.status === "CHECKED_OUT"
                  ? "Đã checkout"
                  : currentAttendance
                    ? "Đã checkin"
                    : "Chưa checkin"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(message || errorMessage) && (
              <div className={errorMessage ? "rounded-md bg-red-50 p-3 text-sm text-red-700" : "rounded-md bg-emerald-50 p-3 text-sm text-emerald-700"}>
                {errorMessage ?? message}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <ImagePicker
                label="Ảnh TimeMark vào ca"
                hint="Bắt buộc để checkin."
                file={files["checkin-personal"]}
                onChange={(file) => setFile("checkin-personal", file)}
              />
              <ImagePicker
                label="Ảnh nhóm vào ca"
                hint="Không bắt buộc nếu hôm đó chỉ có một mình."
                file={files["checkin-group"]}
                onChange={(file) => setFile("checkin-group", file)}
              />
            </div>

            <Button onClick={() => saveMutation.mutate()} disabled={Boolean(currentAttendance) || isBusy}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Checkin
            </Button>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold">Ảnh TimeMark giữa giờ</h3>
                {personalSlots.map((slot, index) => {
                  const key = fileKey("PERSONAL_TIMEMARK", "DURING_SHIFT", slot.time);
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <ImagePicker
                        label={`Mốc ${slot.time}`}
                        file={files[key]}
                        onChange={(file) => setFile(key, file)}
                      />
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={!currentAttendance || uploadSlotMutation.isPending}
                        onClick={() =>
                          uploadSlotMutation.mutate({
                            key,
                            imageType: "PERSONAL_TIMEMARK",
                            phase: "DURING_SHIFT",
                            expectedTime: slot.time,
                            displayOrder: index,
                          })
                        }
                      >
                        Lưu ảnh mốc này
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Ảnh nhóm theo mốc</h3>
                {groupSlots.map((slot, index) => {
                  const phase: AttendanceImagePhase =
                    slot.time === selectedShift.startTime.slice(0, 5)
                      ? "CHECKIN"
                      : slot.time === selectedShift.endTime.slice(0, 5)
                        ? "CHECKOUT"
                        : "DURING_SHIFT";
                  const key = fileKey("GROUP", phase, slot.time);
                  return (
                    <div key={key} className="rounded-lg border p-3">
                      <ImagePicker
                        label={`${slot.label} - ${slot.time}`}
                        hint={phase === "CHECKIN" ? "Người đại diện giơ 2 ngón tay chào." : phase === "CHECKOUT" ? "Người đại diện giơ tay tạm biệt." : undefined}
                        file={files[key]}
                        onChange={(file) => setFile(key, file)}
                      />
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="outline"
                        disabled={!currentAttendance || uploadSlotMutation.isPending}
                        onClick={() =>
                          uploadSlotMutation.mutate({
                            key,
                            imageType: "GROUP",
                            phase,
                            expectedTime: slot.time,
                            displayOrder: index,
                          })
                        }
                      >
                        Lưu ảnh nhóm
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ImagePicker
                label="Ảnh TimeMark tan ca"
                hint="Bắt buộc để checkout."
                file={files["checkout-personal"]}
                onChange={(file) => setFile("checkout-personal", file)}
              />
              <ImagePicker
                label="Ảnh nhóm tan ca"
                hint="Không bắt buộc nếu hôm đó chỉ có một mình."
                file={files["checkout-group"]}
                onChange={(file) => setFile("checkout-group", file)}
              />
            </div>

            <Button onClick={() => checkoutMutation.mutate()} disabled={!currentAttendance || currentAttendance.status === "CHECKED_OUT" || isBusy}>
              {checkoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Checkout
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AttendancePage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === "ADMIN" || user?.role === "MANAGER";
  return isAdmin ? <AdminAttendanceReviewPage /> : <InternAttendancePage />;
}
