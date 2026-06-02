import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, BookOpenText, CheckCircle2, ClipboardList, Image as ImageIcon, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getAdminStudentDetail } from "@/services/cohort.service";
import type { AttendanceAudit, AttendanceImage } from "@/types/api";
import { fallbackToFullImage, getFullImageUrl, getImageDisplayUrl } from "@/utils/cloudinary-image";
import { formatDate } from "@/utils/date-format";

type DetailTab = "overview" | "images" | "journal" | "checks";
type ImageFilter = "ALL" | "PERSONAL" | "GROUP" | "CHECKIN" | "CHECKOUT" | "DURING";

type DayImage = {
  id: string;
  attendanceId: string;
  shiftName: string;
  label: string;
  type: string;
  phase: string;
  expectedTime?: string;
  url?: string;
  thumbnailUrl?: string;
};

const tabs: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "images", label: "Ảnh điểm danh" },
  { id: "journal", label: "Nhật ký" },
  { id: "checks", label: "Kiểm tra" },
];

const imageFilters: { id: ImageFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "PERSONAL", label: "Cá nhân" },
  { id: "GROUP", label: "Nhóm" },
  { id: "CHECKIN", label: "Check-in" },
  { id: "CHECKOUT", label: "Checkout" },
  { id: "DURING", label: "During shift" },
];

function imageItems(attendance: AttendanceAudit): DayImage[] {
  const legacy: DayImage[] = [
    { id: "checkin-personal", attendanceId: attendance.attendanceId, shiftName: attendance.shiftName, label: "TimeMark vào ca", type: "PERSONAL", phase: "CHECKIN", url: attendance.checkinTimemarkImageUrl },
    { id: "checkout-personal", attendanceId: attendance.attendanceId, shiftName: attendance.shiftName, label: "TimeMark tan ca", type: "PERSONAL", phase: "CHECKOUT", url: attendance.checkoutTimemarkImageUrl },
  ].filter((item) => Boolean(item.url));

  const extra = attendance.images.map((image: AttendanceImage) => ({
    id: image.id,
    attendanceId: attendance.attendanceId,
    shiftName: attendance.shiftName,
    label: `${image.imageType} · ${image.phase} · ${image.expectedTime}`,
    type: image.imageType,
    phase: image.phase,
    expectedTime: image.expectedTime,
    url: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
  }));
  return [...legacy, ...extra];
}

function missingEvidenceText(day: { missingPersonalImages: number; missingGroupImages: number; missingReportPages: number }) {
  const missingImages: string[] = [];
  if (day.missingPersonalImages > 0) missingImages.push(`${day.missingPersonalImages} ảnh cá nhân`);
  if (day.missingGroupImages > 0) missingImages.push(`${day.missingGroupImages} ảnh nhóm`);

  if (missingImages.length === 0 && day.missingReportPages > 0) {
    return `Ảnh đã đủ, chỉ thiếu file báo cáo (${day.missingReportPages} trang).`;
  }

  const parts = [...missingImages];
  if (day.missingReportPages > 0) parts.push(`${day.missingReportPages} trang báo cáo`);
  return `Thiếu ${parts.join(", ")}.`;
}

export function AdminStudentWorkDayDetailPage() {
  const { studentId, workDate } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [shiftFilter, setShiftFilter] = useState("ALL");
  const [imageFilter, setImageFilter] = useState<ImageFilter>("ALL");
  const [previewImage, setPreviewImage] = useState<DayImage | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-student-detail", studentId],
    queryFn: () => getAdminStudentDetail(studentId!),
    enabled: Boolean(studentId),
  });

  if (!studentId || !workDate) return <ErrorState message="Thiếu thông tin ngày thực tập cần xem." />;

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (detailQuery.error || !detailQuery.data) return <ErrorState message="Không tải được chi tiết ngày thực tập từ backend." />;

  const detail = detailQuery.data;
  const day = detail.workDays.find((item) => item.workDate === workDate);
  if (!day) return <ErrorState message="Không tìm thấy ngày thực tập này." />;

  const totals = day.attendances.reduce(
    (sum, attendance) => ({
      personalUploaded: sum.personalUploaded + attendance.uploadedPersonalImages,
      personalRequired: sum.personalRequired + attendance.requiredPersonalImages,
      groupUploaded: sum.groupUploaded + attendance.uploadedGroupImages,
      groupRequired: sum.groupRequired + attendance.requiredGroupImages,
    }),
    { personalUploaded: 0, personalRequired: 0, groupUploaded: 0, groupRequired: 0 },
  );

  const allImages = day.attendances.flatMap(imageItems);
  const visibleImages = allImages.filter((image) => {
    const byShift = shiftFilter === "ALL" || image.attendanceId === shiftFilter;
    const byType = imageFilter === "ALL" || image.type.includes(imageFilter) || image.phase.includes(imageFilter);
    return byShift && byType;
  });

  const missingItems = [
    day.missingPersonalImages > 0 ? `${day.missingPersonalImages} ảnh cá nhân` : null,
    day.missingGroupImages > 0 ? `${day.missingGroupImages} ảnh nhóm` : null,
    day.missingReportPages > 0 ? `${day.missingReportPages} trang báo cáo` : null,
    !day.reportEntry ? "chưa có nhật ký" : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <Button asChild variant="outline" size="sm" className="mb-4 bg-white">
            <Link to={`/admin/students/${studentId}`}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại danh sách ngày
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-normal">Chi tiết ngày {formatDate(day.workDate)}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.student.fullName} · {detail.student.studentCode || "Chưa có MSSV"} · {detail.student.studentClass || "Chưa có lớp"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="muted">{detail.student.role}</Badge>
            <Badge tone="muted">{detail.student.cohort?.name || "Chưa có khóa"}</Badge>
            <Badge tone={day.enoughImages ? "success" : "warning"}>{day.enoughImages ? "Đủ ảnh" : "Thiếu ảnh"}</Badge>
            <Badge tone={day.enoughReportPages ? "success" : "warning"}>{day.enoughReportPages ? "Đủ nhật ký" : "Thiếu nhật ký"}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="bg-white/90"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Tổng ca</p><p className="mt-1 text-2xl font-semibold">{day.attendances.length}</p></CardContent></Card>
        <Card className="bg-white/90"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ảnh cá nhân</p><p className="mt-1 text-2xl font-semibold">{totals.personalUploaded}/{totals.personalRequired}</p></CardContent></Card>
        <Card className="bg-white/90"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Ảnh nhóm</p><p className="mt-1 text-2xl font-semibold">{totals.groupUploaded}/{totals.groupRequired}</p></CardContent></Card>
        <Card className="bg-white/90"><CardContent className="p-4"><p className="text-sm text-muted-foreground">Nhật ký</p><p className="mt-1 text-2xl font-semibold">{day.submittedReportPages}/{day.requiredReportPages}</p></CardContent></Card>
      </div>

      {(!day.enoughImages || !day.enoughReportPages) && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{missingEvidenceText(day)}</span>
        </div>
      )}

      <Card className="bg-white/90">
        <CardHeader className="border-b pb-0">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-3 py-3 text-sm font-medium ${activeTab === tab.id ? "border-slate-950 text-slate-950" : "border-transparent text-muted-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {day.attendances.map((attendance) => (
                  <div key={attendance.attendanceId} className="rounded-lg border bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{attendance.shiftName}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{attendance.attendanceDate}</p>
                      </div>
                      <Badge tone={attendance.enoughImages ? "success" : "warning"}>{attendance.enoughImages ? "Đủ minh chứng" : "Còn thiếu"}</Badge>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-md bg-white p-3">Cá nhân: {attendance.uploadedPersonalImages}/{attendance.requiredPersonalImages}</div>
                      <div className="rounded-md bg-white p-3">Nhóm: {attendance.uploadedGroupImages}/{attendance.requiredGroupImages}</div>
                    </div>
                    {!attendance.enoughImages && (
                      <div className="mt-3 text-sm text-amber-800">
                        {attendance.missingPersonalSlots.length > 0 && <p>Thiếu TimeMark: {attendance.missingPersonalSlots.join(", ")}</p>}
                        {attendance.missingGroupSlots.length > 0 && <p>Thiếu ảnh nhóm: {attendance.missingGroupSlots.join(", ")}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "images" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <select className="h-10 rounded-md border bg-white px-3 text-sm" value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
                  <option value="ALL">Tất cả ca</option>
                  {day.attendances.map((attendance) => <option key={attendance.attendanceId} value={attendance.attendanceId}>{attendance.shiftName}</option>)}
                </select>
                <select className="h-10 rounded-md border bg-white px-3 text-sm" value={imageFilter} onChange={(event) => setImageFilter(event.target.value as ImageFilter)}>
                  {imageFilters.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
                </select>
              </div>

              {visibleImages.length > 0 ? (
                <div className="max-h-[620px] overflow-y-auto pr-2">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleImages.map((image) => {
                      const fullUrl = getFullImageUrl(image);
                      const displayUrl = getImageDisplayUrl(image);
                      if (!fullUrl || !displayUrl) return null;
                      return (
                        <button key={`${image.attendanceId}-${image.id}`} type="button" onClick={() => setPreviewImage(image)} className="group text-left">
                          <img src={displayUrl} alt={image.label} loading="lazy" onError={(event) => fallbackToFullImage(event, fullUrl)} className="aspect-video w-full rounded-lg border object-cover transition group-hover:opacity-80" />
                          <p className="mt-1 truncate text-xs font-medium">{image.shiftName}</p>
                          <p className="truncate text-xs text-muted-foreground">{image.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground"><ImageIcon className="mx-auto mb-2 h-6 w-6" />Không có ảnh phù hợp bộ lọc.</div>
              )}
            </div>
          )}

          {activeTab === "journal" && (
            <div className="rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center gap-2 font-medium"><BookOpenText className="h-4 w-4" />Nhật ký thực tập</div>
              {day.reportEntry ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={day.reportEntry.enoughPages ? "success" : "warning"}>{day.reportEntry.pageCount}/{day.reportEntry.requiredPages} trang</Badge>
                    <Badge tone="muted">{day.reportEntry.shiftCodes || "Chưa có ca"}</Badge>
                    <Badge tone="muted">File Word: chưa có dữ liệu API</Badge>
                  </div>
                  <p className="whitespace-pre-wrap rounded-md bg-white p-4 text-sm leading-6 text-slate-700">{day.reportEntry.content || "Chưa có nội dung."}</p>
                  {day.reportEntry.referenceLinks ? <p className="whitespace-pre-wrap rounded-md bg-white p-4 text-sm text-muted-foreground">{day.reportEntry.referenceLinks}</p> : <p className="text-sm text-muted-foreground">Chưa có nguồn trích dẫn.</p>}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed bg-white p-6 text-sm text-muted-foreground">Chưa có nhật ký cho ngày này.</div>
              )}
            </div>
          )}

          {activeTab === "checks" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-medium"><ClipboardList className="h-4 w-4" />Kiểm tra thiếu/đủ</div>
              {missingItems.length > 0 ? missingItems.map((item) => (
                <div key={String(item)} className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="h-4 w-4" />{item}</div>
              )) : (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />Không có mục thiếu.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {previewImage && (() => {
        const fullUrl = getFullImageUrl(previewImage);
        if (!fullUrl) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreviewImage(null)}>
            <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between border-b p-3">
                <div><p className="font-medium">{previewImage.shiftName}</p><p className="text-sm text-muted-foreground">{previewImage.label}</p></div>
                <Button size="icon" variant="ghost" onClick={() => setPreviewImage(null)} aria-label="Đóng ảnh"><X className="h-4 w-4" /></Button>
              </div>
              <div className="max-h-[78vh] overflow-auto bg-slate-950 p-3"><img src={fullUrl} alt={previewImage.label} className="mx-auto max-h-[74vh] w-auto max-w-full rounded object-contain" /></div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
