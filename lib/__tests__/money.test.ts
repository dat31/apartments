import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/money";
import { USD_TO_VND } from "@/lib/data/listings";
import { makeFormatter } from "@/tests/factories";

/* Prices are stored as a single USD amount; `vi` renders converted VND and
   `en` renders the raw USD. Getting the branch wrong would show a Vietnamese
   renter a number 25,000× too small. */

describe("formatMoney", () => {
  const digits = (s: string) => s.replace(/[^\d]/g, "");

  it("converts to VND for the Vietnamese locale", () => {
    const result = formatMoney(makeFormatter("vi"), "vi", 400);
    expect(digits(result)).toBe(String(400 * USD_TO_VND));
    expect(result).toMatch(/₫|VND/);
  });

  it("keeps USD for any other locale", () => {
    const result = formatMoney(makeFormatter("en"), "en", 400);
    expect(digits(result)).toBe("400");
    expect(result).toMatch(/\$|USD/);
  });

  it("drops the fractional part in both locales", () => {
    expect(formatMoney(makeFormatter("en"), "en", 400.75)).not.toContain(".7");
    expect(formatMoney(makeFormatter("vi"), "vi", 400.75)).not.toContain(",7");
  });

  it("formats zero without falling back to something else", () => {
    expect(digits(formatMoney(makeFormatter("en"), "en", 0))).toBe("0");
    expect(digits(formatMoney(makeFormatter("vi"), "vi", 0))).toBe("0");
  });

  it("preserves ordering after conversion", () => {
    const cheap = formatMoney(makeFormatter("vi"), "vi", 300);
    const dear = formatMoney(makeFormatter("vi"), "vi", 900);
    expect(Number(digits(cheap))).toBeLessThan(Number(digits(dear)));
  });
});
