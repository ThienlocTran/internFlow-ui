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
  studentClass?: string;
  school?: string;
  phone?: string;
  cohort?: InternshipCohort | null;
  role: UserRole;
  active: boolean;
};

export type InternshipCohort = {
  id: string;
  code: string;
  name: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  defaultForNewStudents: boolean;
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
  nightShiftBonusThreshold: number;
  nightShiftBonusAmount: number;
};

export type AttendanceStatus = "PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "ABSENT" | "REJECTED";

export type AttendanceImageType = "PERSONAL_TIMEMARK" | "GROUP";

export type AttendanceImagePhase = "CHECKIN" | "DURING_SHIFT" | "CHECKOUT";

export type AttendanceImage = {
  id: string;
  attendanceId: string;
  imageType: AttendanceImageType;
  phase: AttendanceImagePhase;
  expectedTime: string;
  imageUrl: string;
  displayOrder: number;
  note?: string;
  uploadedAt: string;
};

export type Attendance = {
  id: string;
  user: User;
  shift: Shift;
  attendanceDate: string;
  status: AttendanceStatus;
  checkinTime?: string;
  checkoutTime?: string;
  checkinTimemarkImageUrl?: string;
  checkinGroupImageUrl?: string;
  checkoutTimemarkImageUrl?: string;
  checkoutGroupImageUrl?: string;
  note?: string;
  reportPageCount: number;
  reportDocumentUrl?: string;
  images: AttendanceImage[];
};

export type ImageUpload = {
  url: string;
  publicId: string;
  originalFilename?: string;
};

export type ScheduleRegistrationStatus = "REGISTERED" | "CANCELLED";

export type ScheduleRegistration = {
  id: string;
  user: User;
  shift: Shift;
  scheduleDate: string;
  status: ScheduleRegistrationStatus;
  note?: string;
  createdAt: string;
};

export type ScheduleCapacity = {
  scheduleDate: string;
  shiftId: string;
  registeredCount: number;
  maxParticipants: number;
  full: boolean;
};

export type AttendanceAudit = {
  attendanceId: string;
  shiftName: string;
  attendanceDate: string;
  requiredPersonalImages: number;
  uploadedPersonalImages: number;
  missingPersonalImages: number;
  requiredGroupImages: number;
  uploadedGroupImages: number;
  missingGroupImages: number;
  requiredReportPages: number;
  submittedReportPages: number;
  enoughImages: boolean;
  enoughReportPages: boolean;
  images: AttendanceImage[];
};

export type StudentDetail = {
  student: User;
  cohort?: InternshipCohort | null;
  completedCompanyShifts: number;
  remainingCompanyShifts: number;
  requiredCompanyShifts: number;
  requiredHomeShifts: number;
  attendances: AttendanceAudit[];
};
