import { UploadCloud } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";

export function AttendancePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal">Attendance</h1>
        <p className="mt-2 text-sm text-muted-foreground">Choose a shift, upload TimeMark proof, then check in or out.</p>
      </div>
      <Card className="bg-white/90">
        <CardHeader>
          <CardTitle>Checkin workspace</CardTitle>
          <CardDescription>Full shift selector and image preview will live here next.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={UploadCloud}
            title="Attendance form is queued"
            description="The route is ready. Next step is wiring ShiftSelector, UploadImageBox, validation, and API mutations."
          />
          <Button className="mt-5">Prepare checkin</Button>
        </CardContent>
      </Card>
    </div>
  );
}
