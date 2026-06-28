import { z } from "zod";

/** A translator scoped to the `validation` message namespace. */
type T = (key: string) => string;

// Mirrors the Supabase Auth password policy (min length 8 + required
// character classes). Keep in sync with the Email provider settings in the
// dashboard so the form rejects weak passwords before they hit Supabase.
const passwordSchema = (t: T) =>
  z
    .string()
    .min(8, t("password.min"))
    .regex(/[a-z]/, t("password.lowercase"))
    .regex(/[A-Z]/, t("password.uppercase"))
    .regex(/[0-9]/, t("password.number"))
    .regex(/[^A-Za-z0-9]/, t("password.symbol"));

export const createSignInSchema = (t: T) =>
  z.object({
    email: z.string().min(1, t("email.required")).email(t("email.invalid")),
    password: z.string().min(1, t("password.required")),
    remember: z.boolean(),
  });
export type SignInValues = z.infer<ReturnType<typeof createSignInSchema>>;

export const createSignUpSchema = (t: T) =>
  z.object({
    role: z.enum(["renter", "owner"]),
    name: z.string().min(1, t("name.required")),
    email: z.string().min(1, t("email.required")).email(t("email.invalid")),
    password: passwordSchema(t),
    agree: z.literal(true, { message: t("terms") }),
  });
export type SignUpValues = z.infer<ReturnType<typeof createSignUpSchema>>;

export const createForgotSchema = (t: T) =>
  z.object({
    email: z.string().min(1, t("email.required")).email(t("email.invalid")),
  });
export type ForgotValues = z.infer<ReturnType<typeof createForgotSchema>>;

export const createResetPasswordSchema = (t: T) =>
  z
    .object({
      password: passwordSchema(t),
      confirm: z.string().min(1, t("password.confirm")),
    })
    .refine((v) => v.password === v.confirm, {
      message: t("password.mismatch"),
      path: ["confirm"],
    });
export type ResetPasswordValues = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>;
