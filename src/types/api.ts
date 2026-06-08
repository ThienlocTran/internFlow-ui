export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type UserRole = "INTERN" | "TEAM_LEADER" | "ADMIN";

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
  profileComplete: boolean;
  missingProfileFields: string[];
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
  shiftOrder: number;
  displayGroup?: string;
  nightShift?: boolean;
  isNightShift?: boolean;
  active: boolean;
};

export type ShiftPayload = {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  category: "COMPANY" | "HOME_REPORT";
  maxParticipants: number;
  shiftOrder: number;
  displayGroup?: string;
  isNightShift?: boolean;
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

export type AttendancePhotoRequirementStatus = "PENDING" | "SATISFIED" | "SKIPPED";

export type AttendanceImage = {
  id: string;
  attendanceId: string;
  imageType: AttendanceImageType;
  phase: AttendanceImagePhase;
  expectedTime: string;
  imageUrl: string;
  storageProvider?: string;
  publicId?: string;
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  sourceReference?: string;
  displayOrder: number;
  note?: string;
  uploadedAt: string;
  retentionUntil?: string;
  deletedAt?: string;
  deleteStatus?: string;
};

export type AttendancePhotoChecklistItem = {
  id: string;
  attendanceId: string;
  userId: string;
  shiftId: string;
  attendanceDate: string;
  expectedTime: string;
  type: AttendanceImageType;
  phase: AttendanceImagePhase;
  status: AttendancePhotoRequirementStatus;
  imageUrl?: string;
  reason?: string;
  note?: string;
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
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
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
  participants: User[];
};

export type ShiftPeer = {
  user: User;
  schedules: ScheduleRegistration[];
  compliance?: {
    missingImages: number;
    missingReportPages: number;
    enoughImages: boolean;
    enoughReportPages: boolean;
  };
};

export type TeamMemberFullDetail = {
  user: User;
  date: string;
  scheduleRegistrations: ScheduleRegistration[];
  attendances: Attendance[];
  reportEntries: DailyReportEntry[];
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
  checkinTimemarkImageUrl?: string;
  checkinGroupImageUrl?: string;
  checkoutTimemarkImageUrl?: string;
  checkoutGroupImageUrl?: string;
  missingPersonalSlots: string[];
  missingGroupSlots: string[];
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

export type StudentWorkDayDetail = {
  workDate: string;
  attendances: AttendanceAudit[];
  reportEntry?: ReportEntry | null;
  missingPersonalImages: number;
  missingGroupImages: number;
  requiredReportPages: number;
  submittedReportPages: number;
  missingReportPages: number;
  enoughImages: boolean;
  enoughReportPages: boolean;
};

export type AdminStudentDetail = {
  student: User;
  cohort?: InternshipCohort | null;
  completedCompanyShifts: number;
  remainingCompanyShifts: number;
  requiredCompanyShifts: number;
  requiredHomeShifts: number;
  workDays: StudentWorkDayDetail[];
};

export type ReportEntryStatus = "DRAFT" | "READY_FOR_MAIL" | "NEEDS_MORE_PAGES";

export type ReportDocument = {
  id: string;
  user: User;
  title: string;
  totalPages: number;
  completedShiftCount: number;
  currentFileName?: string;
  updatedAt?: string;
};

export type ReportEntry = {
  id: string;
  documentId: string;
  workDate: string;
  shiftCodes?: string;
  shiftCount: number;
  workTimeSummary?: string;
  content?: string;
  referenceLinks?: string;
  sourceReferences?: string;
  pageCount: number;
  requiredPages: number;
  status: ReportEntryStatus;
  enoughPages: boolean;
  updatedAt?: string;
};

export type ReportRevision = {
  id: string;
  entryId: string;
  diffSummary: string;
  pageCountBefore: number;
  pageCountAfter: number;
  newContent?: string;
  createdAt: string;
};

export type ReportWordUpload = {
  entry: ReportEntry;
  fileName: string;
  downloadUrl: string;
  pageCount: number;
  wordCount: number;
};

export type ReportProgress = {
  document: ReportDocument;
  entries: ReportEntry[];
};

export type DailyReportEntry = {
  document: ReportDocument;
  entry: ReportEntry;
};


export type DailyMailReadinessItem = {
  code: string;
  label: string;
  ready: boolean;
  status: string;
  missing: string[];
  detail?: string;
};

export type DailyMailReadiness = {
  userId: string;
  workDate: string;
  ready: boolean;
  subject: string;
  attachmentName?: string;
  shiftSummary?: string;
  workTimeSummary?: string;
  scheduleCount: number;
  attendanceCount: number;
  requiredPhotoCount: number;
  satisfiedPhotoCount: number;
  skippedPhotoCount: number;
  missingPhotoCount: number;
  journalEntry?: ReportEntry | null;
  checks: DailyMailReadinessItem[];
  photoChecklist: AttendancePhotoChecklistItem[];
};
export type MailSubmitResult = {
  to: string;
  cc: string;
  subject: string;
  attachmentName: string;
};
