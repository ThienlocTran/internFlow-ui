import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";

export function ReportsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Báo cáo</h1>
        <p className="mt-2 text-sm text-muted-foreground">Xuất thống kê phục vụ xác nhận thực tập.</p>
      </div>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Khu báo cáo</CardTitle>
          <CardDescription>Chưa có API thống kê attendance để xuất báo cáo thật.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Chưa có dữ liệu báo cáo"
            description="Cần endpoint tổng hợp số ca đã đi, số ca còn thiếu và trạng thái hoàn tất của từng sinh viên."
          />
        </CardContent>
      </Card>
    </div>
  );
}
