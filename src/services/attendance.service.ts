import { apiRequest } from "@/api/http";
import type {
  Attendance,
  AttendanceImage,
  AttendanceImagePhase,
  AttendanceImageType,
  AttendancePhotoChecklistItem,
} from "@/types/api";

export type CheckinPayload = {
  userId: string;
  shiftId: string;
  attendanceDate: string;
  timemarkImageUrl: string;
  groupImageUrl?: string;
  note?: string;
};

export type CheckoutPayload = {
  timemarkImageUrl: string;
  groupImageUrl?: string;
  note?: string;
};

export type AttendanceImagePayload = {
  requirementId?: string;
  imageType: AttendanceImageType;
  phase: AttendanceImagePhase;
  expectedTime: string;
  imageUrl: string;
  storageProvider?: string;
  publicId?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  displayOrder?: number;
  note?: string;
};

export type AttendancePhotoSkipPayload = {
  reason: string;
};

export function getAttendances(userId: string, date: string) {
  return apiRequest<Attendance[]>(`/attendances?userId=${userId}&date=${date}`);
}

export function getPhotoChecklist(userId: string, shiftId: string, date: string) {
  return apiRequest<AttendancePhotoChecklistItem[]>(`/attendances/photo-checklist?userId=${userId}&shiftId=${shiftId}&date=${date}`);
}

export function checkin(payload: CheckinPayload) {
  return apiRequest<Attendance>("/attendances/checkin", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function checkout(attendanceId: string, payload: CheckoutPayload) {
  return apiRequest<Attendance>(`/attendances/${attendanceId}/checkout`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveCheckoutDraft(attendanceId: string, payload: CheckoutPayload) {
  return apiRequest<Attendance>(`/attendances/${attendanceId}/checkout-draft`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addAttendanceImage(attendanceId: string, payload: AttendanceImagePayload) {
  return apiRequest<AttendanceImage>(`/attendances/${attendanceId}/images`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addAttendanceImageByRequirement(attendanceId: string, requirementId: string, payload: AttendanceImagePayload) {
  return apiRequest<AttendanceImage>(`/attendances/${attendanceId}/requirements/${requirementId}/images`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function skipAttendancePhotoRequirement(attendanceId: string, requirementId: string, payload: AttendancePhotoSkipPayload) {
  return apiRequest<AttendancePhotoChecklistItem>(`/attendances/${attendanceId}/requirements/${requirementId}/skip`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
