"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/chip";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUploader } from "./photo-uploader";
import { AmenityPicker } from "./amenity-picker";
import { LocationPicker } from "./location-picker";
import { CostsTermsSection } from "./costs-terms-section";
import { useListings } from "@/hooks/use-listings";
import { todayYmd } from "../[id]/constants/tours";
import { TYPES } from "@/schemas/listing";
import {
  DISTRICTS,
  DISTRICT_LABELS,
  District,
  BED_OPTIONS,
  BATH_OPTIONS,
} from "../constants/listing-form";
import {
  createListingFormSchema,
  blankListingForm,
  listingToForm,
  formToCore,
  type ListingFormValues,
} from "@/schemas/listing";
import { TranslationEditor } from "./translation-editor";
import { type Locale } from "@/i18n/routing";
import { ArrowLeft, Clock } from "lucide-react";
import posthog from "posthog-js";

const DASHBOARD = "/owner/dashboard";

// `today` is a client-only value: an empty server snapshot keeps prerender and
// hydration in agreement, and the never-firing subscribe means the date is read
// once on mount. `todayYmd` is Da Nang-relative, so repeat calls within a day
// return the same string and the snapshot stays stable.
const subscribeNever = () => () => {};
const noTodayOnServer = () => "";

export function ListingForm({
  mode,
  listingId,
}: {
  mode: "create" | "edit";
  listingId?: string;
}) {
  const t = useTranslations("listingForm");
  const tt = useTranslations("apartments");
  const tv = useTranslations("validation");
  const listingFormSchema = React.useMemo(
    () => createListingFormSchema(tv),
    [tv]
  );
  const router = useRouter();
  const { getById, addListing, updateListing, ready } = useListings();
  const isEdit = mode === "edit";

  const existing = isEdit && listingId ? getById(listingId) : undefined;

  /* A new listing's base language is the one the owner is authoring in; an
     existing one keeps whatever it was written in, so editing from /en never
     relabels a Vietnamese listing as English. */
  const uiLocale = useLocale() as Locale;
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: existing
      ? listingToForm(existing)
      : { ...blankListingForm, baseLocale: uiLocale },
  });
  const {
    register,
    control,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  // Resolve "today" after mount so the date input's min matches the clock
  // without risking an SSR/hydration mismatch.
  const today = React.useSyncExternalStore(
    subscribeNever,
    todayYmd,
    noTodayOnServer
  );

  // On a direct load / refresh of the edit page the owner's listings may not
  // be in cache yet, so `existing` arrives after the first render — populate
  // the form once it does.
  const hydrated = React.useRef(false);
  React.useEffect(() => {
    if (isEdit && existing && !hydrated.current) {
      hydrated.current = true;
      form.reset(listingToForm(existing));
    }
  }, [isEdit, existing, form]);

  const [saving, setSaving] = React.useState(false);

  const [
    images,
    type,
    beds,
    baths,
    district,
    available,
    lat,
    lng,
    amenities,
    costs,
    price,
    baseLocale,
  ] = useWatch({
    control,
    name: [
      "images",
      "type",
      "beds",
      "baths",
      "district",
      "available",
      "lat",
      "lng",
      "amenities",
      "costs",
      "price",
      "baseLocale",
    ],
  });

  // Keep the listing's own district selectable even if it predates the list.
  const districtOptions =
    !district || DISTRICTS.includes(district as never)
      ? [...DISTRICTS]
      : [district, ...DISTRICTS];

  const save = async (v: ListingFormValues, status: "active" | "draft") => {
    if (saving) return;
    setSaving(true);
    const core = formToCore(v);
    try {
      if (isEdit && listingId) await updateListing(listingId, core, status);
      else {
        await addListing(core, status);
        posthog.capture("listing_created", {
          listing_status: status,
          listing_type: core.type,
          listing_district: core.district,
        });
      }
      router.push(DASHBOARD);
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)));
      toast.error(t("saveError"));
      setSaving(false);
    }
  };

  const setField = (name: keyof ListingFormValues, value: string | string[]) =>
    setValue(name, value as never, { shouldValidate: true, shouldDirty: true });

  // Editing a listing that isn't in the owner's set: wait for the load, then
  // 404 if it's genuinely absent (or not theirs).
  if (isEdit && !existing) {
    if (!ready) {
      return (
        <div className="container mx-auto px-5 sm:px-8 py-16 text-center text-muted-foreground anim-fade">
          {t("loading")}
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="container mx-auto px-5 sm:px-8 py-8 anim-up">
      <button
        type="button"
        onClick={() => router.push(DASHBOARD)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-5 focus-ring"
      >
        <ArrowLeft size={18} /> {t("backToDashboard")}
      </button>

      <h1 className="text-3xl font-semibold tracking-tight">
        {isEdit ? t("editTitle") : t("newTitle")}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {isEdit ? t("editSubtitle") : t("newSubtitle")}
      </p>

      <form className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 lg:gap-8 items-start">
        <div className="flex flex-col gap-6 min-w-0">
        {/* Photos */}
        <section className="bg-card p-6">
          <h2 className="font-semibold mb-1">{t("photos")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("photosHint")}
          </p>
          <PhotoUploader
            value={images}
            onChange={(next) => setField("images", next)}
          />
        </section>

        {/* The owner's own words, in whatever language they write them in.
            This is the listing's original: the only copy ever required, and
            what every renter falls back to. Other languages sit on top of it,
            in their own section below. */}
        <section className="bg-card p-6 flex flex-col gap-5">
          <div>
            <h2 className="font-semibold">{t("copy")}</h2>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {t("copyHint")}
            </p>
          </div>

          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
            <Input
              id="title"
              lang={baseLocale}
              placeholder={t("titlePlaceholder")}
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            <FieldError errors={errors.title ? [errors.title] : undefined} />
          </Field>

          <Field>
            <FieldLabel htmlFor="desc">{t("description")}</FieldLabel>
            <Textarea
              id="desc"
              rows={4}
              lang={baseLocale}
              placeholder={t("descriptionPlaceholder")}
              {...register("desc")}
            />
          </Field>
        </section>

        {/* Other languages — additive, and never a condition of publishing. */}
        <TranslationEditor
          form={form}
          isLive={isEdit && existing?.status === "active"}
        />

        {/* Basics */}
        <section className="bg-card p-6 flex flex-col gap-5">
          <h2 className="font-semibold">{t("basics")}</h2>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field>
              <FieldLabel>{t("homeType")}</FieldLabel>
              <Select
                value={type}
                onValueChange={(v) => setField("type", v)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tt(`types.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={!!errors.price}>
              <FieldLabel htmlFor="price">{t("price")}</FieldLabel>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                placeholder="1800"
                aria-invalid={!!errors.price}
                {...register("price")}
              />
              <FieldError errors={errors.price ? [errors.price] : undefined} />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-5">
            <Field>
              <FieldLabel>{t("bedrooms")}</FieldLabel>
              <Select
                value={beds}
                onValueChange={(v) => setField("beds", v)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BED_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 0 ? t("studio") : n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>{t("bathrooms")}</FieldLabel>
              <Select
                value={baths}
                onValueChange={(v) => setField("baths", v)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATH_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={!!errors.area}>
              <FieldLabel htmlFor="area">{t("area")}</FieldLabel>
              <Input
                id="area"
                type="number"
                inputMode="numeric"
                placeholder="58"
                aria-invalid={!!errors.area}
                {...register("area")}
              />
              <FieldError errors={errors.area ? [errors.area] : undefined} />
            </Field>
          </div>

          <Field data-invalid={!!errors.district}>
            <FieldLabel>{t("district")}</FieldLabel>
            <Select
              value={district}
              onValueChange={(v) => setField("district", v)}
            >
              <SelectTrigger
                className="w-full h-9"
                aria-invalid={!!errors.district}
              >
                <SelectValue placeholder={t("districtPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {districtOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {DISTRICT_LABELS[d as District] ?? d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError
              errors={errors.district ? [errors.district] : undefined}
            />
          </Field>

          <Field>
            <FieldLabel>{t("availableFrom")}</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Chip
                className="h-8"
                active={available === "now"}
                onClick={() => setField("available", "now")}
              >
                <Clock size={16} /> {t("now")}
              </Chip>
              <span className="text-sm text-muted-foreground">{t("or")}</span>
              <DatePicker
                min={today || undefined}
                placeholder={t("pickDate")}
                value={available === "now" ? undefined : available}
                onChange={(v) => setField("available", v || "now")}
                className={cn(
                  available !== "now" && available && "ring-2 ring-primary"
                )}
              />
            </div>
            <FieldDescription>{t("availableHint")}</FieldDescription>
          </Field>

        </section>

        {/* Location pin */}
        <section className="bg-card p-6">
          <h2 className="font-semibold mb-1">{t("location.heading")}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("location.blurb")}
          </p>
          <LocationPicker
            district={district}
            value={lat != null && lng != null ? { lat, lng } : null}
            onChange={(p) => {
              setValue("lat", p?.lat ?? null, { shouldDirty: true });
              setValue("lng", p?.lng ?? null, { shouldDirty: true });
            }}
          />
        </section>

        {/* Amenities */}
        <section className="bg-card p-6">
          <h2 className="font-semibold mb-4">{t("amenities")}</h2>
          <AmenityPicker
            value={amenities}
            onChange={(next) => setField("amenities", next)}
          />
        </section>

        {/* Costs & terms */}
        <CostsTermsSection
          value={costs}
          onChange={(costs) =>
            setValue("costs", costs, { shouldDirty: true })
          }
          price={price}
        />
        </div>

        {/* Publish / actions */}
        <aside className="lg:sticky lg:top-24">
          <div className="bg-card p-6 flex flex-col gap-4">
            <div>
              <h2 className="font-semibold">
                {isEdit ? t("publish.editHeading") : t("publish.newHeading")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isEdit ? t("publish.editBlurb") : t("publish.newBlurb")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full justify-center"
                disabled={saving}
                onClick={handleSubmit((v) => save(v, "active"))}
              >
                {isEdit ? t("publish.saveChanges") : t("publish.publish")}
              </Button>
              {!isEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center"
                  disabled={saving}
                  onClick={handleSubmit((v) => save(v, "draft"))}
                >
                  {t("publish.saveDraft")}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center"
                onClick={() => router.push(DASHBOARD)}
              >
                {t("publish.cancel")}
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
