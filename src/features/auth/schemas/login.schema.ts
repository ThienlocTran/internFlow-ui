import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
