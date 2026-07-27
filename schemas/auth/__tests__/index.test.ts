import { describe, expect, it } from "vitest";
import {
  createForgotSchema,
  createResetPasswordSchema,
  createSignInSchema,
  createSignUpSchema,
} from "@/schemas/auth";
import { INVALID_PASSWORDS, VALID_PASSWORD } from "@/tests/factories";

/* Each schema is a factory taking a translator; an identity stub means the
   assertions read as message keys rather than Vietnamese copy. */
const t = (key: string) => key;

const firstMessage = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error!.issues[0].message;

describe("createSignInSchema", () => {
  const schema = createSignInSchema(t);
  const valid = { email: "renter@example.com", password: "anything", remember: true };

  it("accepts a filled-in form", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("distinguishes a missing email from a malformed one", () => {
    expect(firstMessage(schema.safeParse({ ...valid, email: "" }))).toBe("email.required");
    expect(firstMessage(schema.safeParse({ ...valid, email: "not-an-email" }))).toBe(
      "email.invalid"
    );
  });

  it("requires a password but does not apply the strength policy", () => {
    // Sign-in must accept whatever the account already has.
    expect(schema.safeParse({ ...valid, password: "x" }).success).toBe(true);
    expect(firstMessage(schema.safeParse({ ...valid, password: "" }))).toBe(
      "password.required"
    );
  });
});

describe("createSignUpSchema", () => {
  const schema = createSignUpSchema(t);
  const valid = {
    role: "renter" as const,
    name: "Test Renter",
    email: "renter@example.com",
    password: VALID_PASSWORD,
    agree: true as const,
  };

  it("accepts a valid sign-up", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("enforces every password class the Supabase policy requires", () => {
    const cases: [string, string][] = [
      [INVALID_PASSWORDS.tooShort, "password.min"],
      [INVALID_PASSWORDS.noLower, "password.lowercase"],
      [INVALID_PASSWORDS.noUpper, "password.uppercase"],
      [INVALID_PASSWORDS.noDigit, "password.number"],
      [INVALID_PASSWORDS.noSymbol, "password.symbol"],
    ];
    for (const [password, message] of cases) {
      expect(firstMessage(schema.safeParse({ ...valid, password }))).toBe(message);
    }
  });

  it("uses a fixture that violates exactly one rule per case", () => {
    // Guards the derivation above: if a fixture broke two rules, the message
    // assertions would still pass while testing something else.
    for (const password of Object.values(INVALID_PASSWORDS)) {
      const result = schema.safeParse({ ...valid, password });
      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordIssues = result.error.issues.filter((i) =>
          i.message.startsWith("password.")
        );
        expect(passwordIssues).toHaveLength(1);
      }
    }
  });

  it("requires the terms checkbox to be ticked, not merely present", () => {
    expect(firstMessage(schema.safeParse({ ...valid, agree: false }))).toBe("terms");
  });

  it("rejects a role outside renter and owner", () => {
    expect(schema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });

  it("requires a name", () => {
    expect(firstMessage(schema.safeParse({ ...valid, name: "" }))).toBe("name.required");
  });
});

describe("createForgotSchema", () => {
  const schema = createForgotSchema(t);

  it("accepts a valid address and rejects a malformed one", () => {
    expect(schema.safeParse({ email: "renter@example.com" }).success).toBe(true);
    expect(firstMessage(schema.safeParse({ email: "nope" }))).toBe("email.invalid");
  });
});

describe("createResetPasswordSchema", () => {
  const schema = createResetPasswordSchema(t);

  it("accepts a strong password confirmed correctly", () => {
    expect(
      schema.safeParse({ password: VALID_PASSWORD, confirm: VALID_PASSWORD }).success
    ).toBe(true);
  });

  it("rejects a mismatch and reports it on the confirm field", () => {
    const result = schema.safeParse({
      password: VALID_PASSWORD,
      confirm: `${VALID_PASSWORD}x`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.message === "password.mismatch");
      expect(issue?.path).toEqual(["confirm"]);
    }
  });

  it("still applies the password policy to the new password", () => {
    const weak = INVALID_PASSWORDS.tooShort;
    expect(schema.safeParse({ password: weak, confirm: weak }).success).toBe(false);
  });

  it("requires the confirmation to be filled in", () => {
    expect(schema.safeParse({ password: VALID_PASSWORD, confirm: "" }).success).toBe(false);
  });
});
