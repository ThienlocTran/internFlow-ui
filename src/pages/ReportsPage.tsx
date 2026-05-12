import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";

export function ReportsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Reports</h1>
        <p className="mt-2 text-sm text-muted-foreground">Export attendance summaries for internship sign-off.</p>
      </div>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Reporting workspace</CardTitle>
          <CardDescription>Export tables and charts will be added in the admin phase.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="Reports route is ready"
            description="This keeps the navigation complete while the data layer evolves."
          />
        </CardContent>
      </Card>
    </div>
  );
}
