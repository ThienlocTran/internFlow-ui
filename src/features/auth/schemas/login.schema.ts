import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
