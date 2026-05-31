import { apiRequest } from "@/api/http";
import type {
  Attendance,
  AttendanceImage,
  AttendanceImagePhase,
  AttendanceImageType,
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

export function getAttendances(userId: string, date: string) {
  return apiRequest<Attendance[]>(`/attendances?userId=${userId}&date=${date}`);
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
