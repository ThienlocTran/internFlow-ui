const data = [62, 75, 48, 83, 69, 91, 77];
const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StatisticsChart() {
  return (
    <div className="flex h-48 items-end gap-3">
      {data.map((value, index) => (
        <div key={labels[index]} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-36 w-full items-end rounded-md bg-slate-100">
            <div
              className="w-full rounded-md bg-slate-950 transition-all"
              style={{ height: `${value}%` }}
              aria-label={`${labels[index]} attendance ${value}%`}
            />
          </div>
          <span className="text-xs text-muted-foreground">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}
