import type { User, UserRole } from "@/types/api";

const requiredProfileFields = ["fullName", "studentCode", "studentClass", "school", "phone"] as const;

type ProfileFieldKey = (typeof requiredProfileFields)[number];

export const profileFieldLabels: Record<string, string> = {
  fullName: "ho ten",
  studentCode: "MSSV",
  studentClass: "lop",
  school: "truong",
  phone: "so dien thoai",
};

export function requiresCompleteProfile(role: UserRole) {
  return role === "INTERN" || role === "TEAM_LEADER";
}

export function getMissingProfileFields(user: User) {
  if (!requiresCompleteProfile(user.role)) {
    return [];
  }
  if (Array.isArray(user.missingProfileFields) && user.missingProfileFields.length > 0) {
    return user.missingProfileFields;
  }
  return requiredProfileFields.filter((field: ProfileFieldKey) => !user[field]);
}

export function isProfileComplete(user: User) {
  if (!requiresCompleteProfile(user.role)) {
    return true;
  }
  if (typeof user.profileComplete === "boolean") {
    return user.profileComplete;
  }
  return getMissingProfileFields(user).length === 0;
}