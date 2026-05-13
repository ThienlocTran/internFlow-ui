import { z } from "zod";

export const profileSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  fullName: z.string().min(2, "Vui lòng nhập họ tên"),
  studentCode: z.string().min(2, "Vui lòng nhập mã số sinh viên"),
  studentClass: z.string().min(1, "Vui lòng nhập lớp"),
  school: z.string().min(2, "Vui lòng nhập trường"),
  phone: z.string().min(8, "Vui lòng nhập số điện thoại"),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
