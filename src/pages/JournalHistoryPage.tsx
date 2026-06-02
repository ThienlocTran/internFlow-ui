import { useMemo, useState } from "react";
import { GitCommitVertical, SplitSquareHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { getReportProgress, getReportRevisions } from "@/services/report-journal.service";
import { useAuthStore } from "@/store/auth-store";
import type { ReportEntry, ReportRevision } from "@/types/api";
import { formatDate } from "@/utils/date-format";

function statusLabel(entry: ReportEntry) {
  return entry.enoughPages ? "Đủ trang" : `Thiếu ${Math.max(0, entry.requiredPages - entry.pageCount)} trang`;
}

function previousContent(entry: ReportEntry, revisions: ReportRevision[], revision: ReportRevision) {
  const ordered = [...revisions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const index = ordered.findIndex((item) => item.id === revision.id);
  if (index > 0) return ordered[index - 1].newContent ?? "";
  return entry.content ?? "";
}

function diffTokens(before: string, after: string) {
  const beforeTokens = before.split(/(\s+)/);
  const afterSet = new Set(after.split(/\s+/).filter(Boolean));
  const afterTokens = after.split(/(\s+)/);
  const beforeSet = new Set(before.split(/\s+/).filter(Boolean));
  return {
    before: beforeTokens.map((token, index) => ({ token, changed: token.trim() !== "" && !afterSet.has(token) && !after.includes(token), index })),
    after: afterTokens.map((token, index) => ({ token, changed: token.trim() !== "" && !beforeSet.has(token) && !before.includes(token), index })),
  };
}

function DiffPane({ title, tokens, tone }: { title: string; tokens: ReturnType<typeof diffTokens>["before"]; tone: "old" | "new" }) {
  return (
    <div className="min-h-[420px] rounded-lg border bg-white p-4">
      <p className="mb-3 text-sm font-semibold text-slate-700">{title}</p>
      <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
        {tokens.map(({ token, changed, index }) => (
          <span key={`${index}-${token}`} className={changed ? (tone === "old" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800") : undefined}>
            {token}
          </span>
        ))}
      </div>
    </div>
  );
}

export function JournalHistoryPage() {
  const user = useAuthStore((state) => state.user);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const progressQuery = useQuery({
    queryKey: ["report-progress", user?.id],
    queryFn: () => getReportProgress(user!.id),
    enabled: Boolean(user?.id),
  });
  const entries = progressQuery.data?.entries ?? [];
  const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0];
  const revisionsQuery = useQuery({
    queryKey: ["report-revisions", selectedEntry?.id],
    queryFn: () => getReportRevisions(selectedEntry!.id),
    enabled: Boolean(selectedEntry?.id),
  });
  const revisions = revisionsQuery.data ?? [];
  const selectedRevision = revisions[revisions.length - 1];
  const diff = useMemo(() => {
    if (!selectedEntry || !selectedRevision) return diffTokens("", selectedEntry?.content ?? "");
    return diffTokens(previousContent(selectedEntry, revisions, selectedRevision), selectedRevision.newContent ?? "");
  }, [selectedEntry, selectedRevision, revisions]);

  if (!user) return <ErrorState message="Bạn cần đăng nhập để xem lịch sử nhật ký." />;
  if (progressQuery.isLoading) return <div className="flex min-h-[50vh] items-center justify-center"><LoadingSpinner className="h-8 w-8" /></div>;
  if (progressQuery.error || !progressQuery.data) return <ErrorState message="Không tải được lịch sử nhật ký." />;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Lịch sử nhật ký</h1>
        <p className="mt-2 text-sm text-muted-foreground">Chọn một ngày để xem lịch sử sửa và so sánh nội dung cũ - mới.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="bg-white/90">
          <CardHeader>
            <CardTitle>Ngày đã viết</CardTitle>
            <CardDescription>Bấm từng ngày để xem chi tiết chỉnh sửa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {entries.map((entry) => (
              <button key={entry.id} type="button" className={`w-full rounded-lg border p-4 text-left transition ${selectedEntry?.id === entry.id ? "border-slate-950 bg-slate-950 text-white" : "bg-white hover:bg-slate-50"}`} onClick={() => setSelectedEntryId(entry.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatDate(entry.workDate)}</p>
                    <p className={selectedEntry?.id === entry.id ? "mt-1 text-xs text-slate-200" : "mt-1 text-xs text-muted-foreground"}>{entry.shiftCodes || "Chưa có ca"}</p>
                  </div>
                  <Badge tone={entry.enoughPages ? "success" : "warning"}>{statusLabel(entry)}</Badge>
                </div>
                <p className={selectedEntry?.id === entry.id ? "mt-3 line-clamp-2 text-sm text-slate-200" : "mt-3 line-clamp-2 text-sm text-muted-foreground"}>{entry.content || "Chưa có nội dung"}</p>
              </button>
            ))}
            {entries.length === 0 && <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Chưa có nhật ký.</p>}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white/90">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>So sánh chỉnh sửa</CardTitle>
                  <CardDescription>{selectedEntry ? `${formatDate(selectedEntry.workDate)} · ${selectedEntry.shiftCodes || "Chưa có ca"}` : "Chưa chọn ngày"}</CardDescription>
                </div>
                <Badge tone="muted"><SplitSquareHorizontal className="h-3.5 w-3.5" /> 2 khung</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {revisionsQuery.isLoading ? <LoadingSpinner className="h-6 w-6" /> : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <DiffPane title="Bản cũ" tokens={diff.before} tone="old" />
                  <DiffPane title="Bản mới" tokens={diff.after} tone="new" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Lịch sử commit</CardTitle>
              <CardDescription>Các lần lưu gần đây của ngày đang chọn.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {revisions.length > 0 ? revisions.map((revision) => (
                <div key={revision.id} className="rounded-lg border bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium"><GitCommitVertical className="h-4 w-4" />{revision.diffSummary}</div>
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(revision.createdAt).toLocaleString("vi-VN")}</p>
                </div>
              )) : <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Chưa có lịch sử sửa.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
