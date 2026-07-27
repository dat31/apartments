import { describe, expect, it } from "vitest";
import {
  createTourBookingSchema,
  createTourSignInSchema,
  tourRequestSchema,
} from "@/schemas/tour";
import { makeTour } from "@/tests/factories";

/** Schemas are factories taking a translator; an identity stub keeps the
    assertions about message keys rather than Vietnamese copy. */
const t = (key: string) => key;

describe("tourRequestSchema", () => {
  it("accepts a tour request", () => {
    expect(tourRequestSchema.safeParse(makeTour()).success).toBe(true);
  });

  it("accepts the proposed slot fields on a reschedule", () => {
    const tour = makeTour({
      status: "reschedule",
      proposedDate: "2026-07-01",
      proposedTime: "15:00",
    });
    expect(tourRequestSchema.safeParse(tour).success).toBe(true);
  });

  it("rejects a status outside the known lifecycle", () => {
    expect(tourRequestSchema.safeParse(makeTour({ status: "cancelled" as never })).success).toBe(
      false
    );
  });

  it("requires createdAt to be a timestamp number", () => {
    expect(
      tourRequestSchema.safeParse({ ...makeTour(), createdAt: "2026-06-15" }).success
    ).toBe(false);
  });
});

describe("createTourBookingSchema", () => {
  const schema = createTourBookingSchema(t);

  it("requires a date and a time, and nothing else", () => {
    expect(schema.safeParse({ date: "2026-06-15", time: "10:00" }).success).toBe(true);
    expect(schema.safeParse({ date: "", time: "10:00" }).success).toBe(false);
    expect(schema.safeParse({ date: "2026-06-15", time: "" }).success).toBe(false);
  });

  it("accepts the optional context fields", () => {
    expect(
      schema.safeParse({
        date: "2026-06-15",
        time: "10:00",
        moveIn: "2026-07-01",
        people: "2",
        note: "Bringing my partner",
      }).success
    ).toBe(true);
  });
});

describe("createTourSignInSchema", () => {
  const schema = createTourSignInSchema(t);
  const valid = { name: "Test Renter", email: "renter@example.com", password: "anything" };

  it("accepts a filled-in gate", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("requires a name of at least two characters, trimmed", () => {
    expect(schema.safeParse({ ...valid, name: "A" }).success).toBe(false);
    expect(schema.safeParse({ ...valid, name: "  A  " }).success).toBe(false);
  });

  it("distinguishes a missing email from a malformed one", () => {
    const missing = schema.safeParse({ ...valid, email: "" });
    const malformed = schema.safeParse({ ...valid, email: "nope" });
    expect(missing.success).toBe(false);
    expect(malformed.success).toBe(false);
    if (!missing.success) expect(missing.error.issues[0].message).toBe("email.required");
    if (!malformed.success) expect(malformed.error.issues[0].message).toBe("email.invalid");
  });

  it("requires a password without applying the sign-up strength policy", () => {
    expect(schema.safeParse({ ...valid, password: "x" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, password: "" }).success).toBe(false);
  });
});
