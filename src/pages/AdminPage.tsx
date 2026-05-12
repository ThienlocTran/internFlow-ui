import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";

export function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage users, teams, attendance reports, and statistics.</p>
      </div>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Admin console</CardTitle>
          <CardDescription>Data tables with search, filters, sorting, and pagination come next.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={ShieldCheck}
            title="Admin route is ready"
            description="The navigation is permission-aware and the page shell is prepared for reports."
          />
        </CardContent>
      </Card>
    </div>
  );
}
