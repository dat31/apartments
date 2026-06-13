import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean(),
});
export type SignInValues = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  role: z.enum(["renter", "owner"]),
  name: z.string().min(1, "Add your name"),
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  agree: z.literal(true, { message: "Please accept the terms to continue" }),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
});
export type ForgotValues = z.infer<typeof forgotSchema>;
