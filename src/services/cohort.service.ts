import { apiRequest } from "@/api/http";
import type { InternshipCohort, StudentDetail, User } from "@/types/api";

export type CreateCohortPayload = {
  code: string;
  name: string;
  startDate: string;
  endDate?: string;
  active?: boolean;
  defaultForNewStudents?: boolean;
};

export function getCohorts() {
  return apiRequest<InternshipCohort[]>("/cohorts");
}

export function createCohort(payload: CreateCohortPayload) {
  return apiRequest<InternshipCohort>("/cohorts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCohortStudents(cohortId: string) {
  return apiRequest<User[]>(`/cohorts/${cohortId}/students`);
}

export function getStudentDetail(studentId: string) {
  return apiRequest<StudentDetail>(`/cohorts/students/${studentId}`);
}
