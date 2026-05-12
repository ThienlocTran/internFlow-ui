import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type ProgressCardProps = {
  title: string;
  description: string;
  value: number;
  footer: string;
};

export function ProgressCard({ title, description, value, footer }: ProgressCardProps) {
  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <span className="text-4xl font-semibold tracking-normal">{value}%</span>
          <span className="text-sm text-muted-foreground">{footer}</span>
        </div>
        <Progress value={value} className="mt-5 h-3" />
      </CardContent>
    </Card>
  );
}
