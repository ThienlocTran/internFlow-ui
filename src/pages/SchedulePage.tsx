import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";

export function SchedulePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Schedule</h1>
        <p className="mt-2 text-sm text-muted-foreground">Plan weekly shifts and keep quota warnings visible.</p>
      </div>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Weekly calendar</CardTitle>
          <CardDescription>Quota-aware schedule selection comes next.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CalendarDays}
            title="Calendar shell is ready"
            description="This page will show selected shifts, remaining quota, and role-based warnings."
          />
        </CardContent>
      </Card>
    </div>
  );
}
