import { apiRequest } from "@/api/http";
import type { DailyReportEntry, MailSubmitResult, ReportEntry, ReportProgress, ReportRevision } from "@/types/api";

export type SaveReportEntryPayload = {
  userId: string;
  workDate: string;
  content: string;
  referenceLinks?: string;
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
