import { apiRequest } from "@/api/http";
import { useAuthStore } from "@/store/auth-store";
import type { DailyMailReadiness, DailyReportEntry, MailSubmitResult, ReportEntry, ReportProgress, ReportRevision, ReportWordUpload } from "@/types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";
const MAX_WORD_UPLOAD_BYTES = 10 * 1024 * 1024;
const WORD_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type SaveReportEntryPayload = {
  userId: string;
  workDate: string;
  content: string;
  referenceLinks?: string;
  sourceReferences?: string;
};

export function getReportProgress(userId: string) {
  return apiRequest<ReportProgress>(`/report-journals?userId=${userId}`);
}

export function getDailyReportEntries(workDate: string) {
  return apiRequest<DailyReportEntry[]>(`/report-journals/daily?workDate=${workDate}`);
}

export function saveReportEntry(payload: SaveReportEntryPayload) {
  return apiRequest<ReportEntry>("/report-journals/entries", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getReportRevisions(entryId: string) {
  return apiRequest<ReportRevision[]>(`/report-journals/entries/${entryId}/revisions`);
}

export function uploadReportWord(userId: string, workDate: string, file: File) {
  validateWordFile(file);
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<ReportWordUpload>(`/report-journals/entries/word?userId=${userId}&workDate=${workDate}`, {
    method: "POST",
    body: formData,
  });
}

function validateWordFile(file: File) {
  if (!file) throw new Error("File Word là bắt buộc.");
  if (!file.name.toLowerCase().endsWith(".docx")) throw new Error("Chỉ chấp nhận file .docx.");
  if (file.type && file.type !== WORD_CONTENT_TYPE) throw new Error("Content-Type của file Word không hợp lệ.");
  if (file.size > MAX_WORD_UPLOAD_BYTES) throw new Error("File Word vượt quá giới hạn 10MB.");
}

export async function downloadReportWord(userId: string, workDate: string) {
  const token = useAuthStore.getState().token;
  const response = await fetch(`${API_BASE_URL}/report-journals/entries/word?userId=${userId}&workDate=${workDate}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new Error("Không thể tải file Word đã upload.");
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return { blob, fileName: match?.[1] ?? "nhat-ky.docx" };
}

export function getDailyMailPreview(userId: string, workDate: string) {
  return apiRequest<DailyMailReadiness>(`/report-journals/daily-mail-preview?userId=${userId}&workDate=${workDate}`);
}

export function submitDailyReportMail(
  userId: string,
  workDate: string,
  googleAccessToken: string,
  uploadedDocument?: { name: string; base64: string } | null,
) {
  return apiRequest<MailSubmitResult>("/report-journals/submit-mail", {
    method: "POST",
    body: JSON.stringify({
      userId,
      workDate,
      googleAccessToken,
      uploadedDocumentName: uploadedDocument?.name,
      uploadedDocumentBase64: uploadedDocument?.base64,
    }),
  });
}

export function confirmDailyReportMailSent(userId: string, workDate: string) {
  return apiRequest<MailSubmitResult>("/report-journals/confirm-mail-sent", {
    method: "POST",
    body: JSON.stringify({ userId, workDate }),
  });
}
