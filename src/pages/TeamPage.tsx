import { UsersRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/EmptyState";

export function TeamPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Team</h1>
        <p className="mt-2 text-sm text-muted-foreground">Team leaders can monitor members, missing shifts, and weekly progress.</p>
      </div>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Team overview</CardTitle>
          <CardDescription>TeamTable and member progress will be added here.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={UsersRound}
            title="Team dashboard route is ready"
            description="The sidebar already hides this page from regular interns."
          />
        </CardContent>
      </Card>
    </div>
  );
}
