export type DashboardMetric = {
  label: string;
  value: string;
  helper: string;
  trend: string;
};

export type RecentAttendance = {
  id: string;
  shift: string;
  date: string;
  status: "CHECKED_IN" | "CHECKED_OUT" | "PENDING";
  proof: string;
};
