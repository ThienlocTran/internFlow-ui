import type { DashboardMetric, RecentAttendance } from "@/types/dashboard";

export type DashboardSummary = {
  metrics: DashboardMetric[];
  weeklyProgress: number;
  quotaProgress: number;
  recentAttendance: RecentAttendance[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return {
    metrics: [
      { label: "Completed shifts", value: "38", helper: "Company attendance", trend: "+6 this week" },
      { label: "Weekly progress", value: "5 / 6", helper: "Target shifts", trend: "83% complete" },
      { label: "Remaining shifts", value: "22", helper: "Before internship sign-off", trend: "On track" },
      { label: "Attendance rate", value: "94%", helper: "Checked out successfully", trend: "+4.2%" },
    ],
    weeklyProgress: 83,
    quotaProgress: 63,
    recentAttendance: [
      { id: "1", shift: "Ca 2", date: "May 12, 2026", status: "CHECKED_OUT", proof: "2 images" },
      { id: "2", shift: "Ca 1", date: "May 11, 2026", status: "CHECKED_OUT", proof: "1 image" },
      { id: "3", shift: "Ca 3", date: "May 10, 2026", status: "CHECKED_IN", proof: "2 images" },
    ],
  };
}
