import { z } from "zod";

// Mirrors the Supabase Auth password policy (min length 8 + required
// character classes). Keep in sync with the Email provider settings in the
// dashboard so the form rejects weak passwords before they hit Supabase.
const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

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
  password: passwordSchema,
  agree: z.literal(true, { message: "Please accept the terms to continue" }),
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const forgotSchema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
});
export type ForgotValues = z.infer<typeof forgotSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
