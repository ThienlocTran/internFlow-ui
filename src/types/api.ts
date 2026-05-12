export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type UserRole = "INTERN" | "TEAM_LEADER" | "ADMIN" | "MANAGER";

export type User = {
  id: string;
  email: string;
  fullName: string;
  studentCode?: string;
  school?: string;
  phone?: string;
  role: UserRole;
  active: boolean;
};

export type Shift = {
  id: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  category: "COMPANY" | "HOME_REPORT";
  maxParticipants: number;
  active: boolean;
};

export type RolePolicy = {
  id: string;
  role: UserRole;
  maxShiftsPerDay: number;
  targetShiftsPerWeek: number;
  requiredCompanyShifts: number;
  requiredHomeShifts: number;
};
