"use client";

import { useTranslations } from "next-intl";
import { CircleCheck, Eye, Receipt } from "lucide-react";
import { Chip } from "@/components/chip";
import { UTILITY_ICONS } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { useMoney } from "@/hooks/use-money";
import { depositCash, isTransparent, moveInEstimate } from "@/lib/listing-costs";
import {
  DEPOSIT_TYPES,
  UTILITY_BILLING,
  UTILITY_IDS,
  formCostsToCore,
  type CostsFormValues,
} from "@/schemas/listing";

const LEASE_PRESETS = ["3", "6", "12"] as const;

/* "Costs & terms" section of the listing form. Everything is optional and
   must feel that way — chips toggle off on a second click, and skipping the
   whole section never blocks publishing. The live preview shows the owner
   exactly what renters will see, which is the pitch for filling it in. */
export function CostsTermsSection({
  value,
  onChange,
  price,
}: {
  value: CostsFormValues;
  onChange: (next: CostsFormValues) => void;
  price: string;
}) {
  const t = useTranslations("listingForm.costs");
  const money = useMoney();

  const patch = (p: Partial<CostsFormValues>) => onChange({ ...value, ...p });
  const setUtil = (id: (typeof UTILITY_IDS)[number], mode: string) =>
    patch({
      util: { ...value.util, [id]: value.util[id] === mode ? "" : mode },
    });
  const setAmt = (id: (typeof UTILITY_IDS)[number], amount: string) =>
    patch({ amt: { ...value.amt, [id]: amount } });

  const leaseIsCustom =
    value.minLease !== "" &&
    value.minLease !== "none" &&
    !(LEASE_PRESETS as readonly string[]).includes(value.minLease);

  /* Preview through the same conversion the save path uses, so what the
     owner sees here is exactly what the listing will show. */
  const coreCosts = formCostsToCore(value);
  const preview = moveInEstimate(Number(price) || 0, coreCosts);
  const monthsCash =
    (value.deposit === "1mo" || value.deposit === "2mo") && Number(price) > 0
      ? depositCash(Number(price), coreCosts)
      : null;

  return (
    <section className="bg-card p-6 flex flex-col gap-6">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          <Receipt size={18} className="text-primary" /> {t("heading")}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 text-pretty">
          {t("blurb")}
        </p>
      </div>

      {/* Deposit */}
      <Field>
        <FieldLabel>{t("deposit")}</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {DEPOSIT_TYPES.map((d) => (
            <Chip
              key={d}
              className="h-8"
              active={value.deposit === d}
              onClick={() => patch({ deposit: value.deposit === d ? "" : d })}
            >
              {t(`depositChoice.${d}`)}
            </Chip>
          ))}
        </div>
        {value.deposit === "custom" && (
          <div className="mt-1 max-w-64">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={t("depositAmountPlaceholder")}
              aria-label={t("depositAmountPlaceholder")}
              value={value.depositAmount}
              onChange={(e) => patch({ depositAmount: e.target.value })}
            />
          </div>
        )}
        {monthsCash != null && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {t("depositApprox", { amount: money(monthsCash) })}
          </p>
        )}
      </Field>

      {/* Utilities */}
      <div>
        <span className="block mb-1.5 text-sm font-medium text-foreground">
          {t("utilities")}
        </span>
        <p className="text-xs text-muted-foreground mb-3">
          {t("utilitiesHint")}
        </p>
        <div className="flex flex-col gap-3">
          {UTILITY_IDS.map((id) => {
            const Icon = UTILITY_ICONS[id];
            const mode = value.util[id];
            return (
              <div key={id} className="flex items-center flex-wrap gap-2">
                <span className="flex items-center gap-2 text-[15px] w-32 shrink-0">
                  <Icon size={17} className="text-muted-foreground shrink-0" />{" "}
                  {t(`utility.${id}`)}
                </span>
                {UTILITY_BILLING.map((m) => (
                  <Chip
                    key={m}
                    className="h-8"
                    active={mode === m}
                    onClick={() => setUtil(id, m)}
                  >
                    {t(`utilityMode.${m}`)}
                  </Chip>
                ))}
                {mode === "fixed" && (
                  <div className="w-32 ml-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder={t("amountPlaceholder")}
                      aria-label={t("amountPlaceholder")}
                      value={value.amt[id]}
                      onChange={(e) => setAmt(id, e.target.value)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimum lease */}
      <Field>
        <FieldLabel>{t("minLease")}</FieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            className="h-8"
            active={value.minLease === "none"}
            onClick={() =>
              patch({ minLease: value.minLease === "none" ? "" : "none" })
            }
          >
            {t("leaseNone")}
          </Chip>
          {LEASE_PRESETS.map((m) => (
            <Chip
              key={m}
              className="h-8"
              active={value.minLease === m}
              onClick={() =>
                patch({ minLease: value.minLease === m ? "" : m })
              }
            >
              {t("leaseMonths", { count: Number(m) })}
            </Chip>
          ))}
          <span className="text-sm text-muted-foreground">{t("or")}</span>
          <div className="w-28">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={t("monthsPlaceholder")}
              aria-label={t("monthsPlaceholder")}
              value={leaseIsCustom ? value.minLease : ""}
              onChange={(e) => patch({ minLease: e.target.value })}
            />
          </div>
        </div>
      </Field>

      {/* Live preview of what renters will see */}
      <div className="bg-muted p-4 flex items-start gap-3">
        <Eye size={17} className="text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {t("preview")}
          </p>
          {preview ? (
            <p className="mt-1 text-[15px] tabular-nums text-pretty">
              {preview.noDeposit
                ? t.rich("previewMoveInNoDeposit", {
                    amount: money(preview.total),
                    b: (chunks) => (
                      <span className="font-semibold">{chunks}</span>
                    ),
                  })
                : t.rich("previewMoveIn", {
                    amount: money(preview.total),
                    b: (chunks) => (
                      <span className="font-semibold">{chunks}</span>
                    ),
                  })}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {t("previewEmpty")}
            </p>
          )}
          {isTransparent(coreCosts) && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <CircleCheck size={14} /> {t("previewComplete")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
