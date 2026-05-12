import { AlertTriangle } from "lucide-react";

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
      <AlertTriangle className="h-5 w-5" />
      <span>{message}</span>
    </div>
  );
}
