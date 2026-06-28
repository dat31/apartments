"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { notFound } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useForm } from "react-hook-form";
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
import { useListings } from "@/hooks/use-listings";
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
import { ArrowLeft, Clock } from "lucide-react";

const DASHBOARD = "/owner/dashboard";

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
  const { getById, addListing, updateListing } = useListings();
  const isEdit = mode === "edit";

  const existing = isEdit && listingId ? getById(listingId) : undefined;
  if (isEdit && !existing) notFound();

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: existing ? listingToForm(existing) : blankListingForm,
  });
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  // Resolve "today" after mount so the date input's min matches the client
  // clock without risking an SSR/hydration mismatch.
  const [today, setToday] = React.useState("");
  React.useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const values = watch();

  // Keep the listing's own district selectable even if it predates the list.
  const districtOptions =
    !values.district || DISTRICTS.includes(values.district as never)
      ? [...DISTRICTS]
      : [values.district, ...DISTRICTS];

  const save = (v: ListingFormValues, status: "active" | "draft") => {
    const core = formToCore(v);
    if (isEdit && listingId) updateListing(listingId, core, status);
    else addListing(core, status);
    router.push(DASHBOARD);
  };

  const setField = (name: keyof ListingFormValues, value: string | string[]) =>
    setValue(name, value as never, { shouldValidate: true, shouldDirty: true });

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
            value={values.images}
            onChange={(next) => setField("images", next)}
          />
        </section>

        {/* Basics */}
        <section className="bg-card p-6 flex flex-col gap-5">
          <h2 className="font-semibold">{t("basics")}</h2>

          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">{t("title")}</FieldLabel>
            <Input
              id="title"
              placeholder={t("titlePlaceholder")}
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            <FieldError errors={errors.title ? [errors.title] : undefined} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field>
              <FieldLabel>{t("homeType")}</FieldLabel>
              <Select
                value={values.type}
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
                value={values.beds}
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
                value={values.baths}
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

            <Field>
              <FieldLabel htmlFor="area">{t("area")}</FieldLabel>
              <Input
                id="area"
                type="number"
                inputMode="numeric"
                placeholder="58"
                {...register("area")}
              />
            </Field>
          </div>

          <Field data-invalid={!!errors.district}>
            <FieldLabel>{t("district")}</FieldLabel>
            <Select
              value={values.district}
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
                active={values.available === "now"}
                onClick={() => setField("available", "now")}
              >
                <Clock size={16} /> {t("now")}
              </Chip>
              <span className="text-sm text-muted-foreground">{t("or")}</span>
              <DatePicker
                min={today || undefined}
                placeholder={t("pickDate")}
                value={values.available === "now" ? undefined : values.available}
                onChange={(v) => setField("available", v || "now")}
                className={cn(
                  values.available !== "now" &&
                    values.available &&
                    "ring-2 ring-primary"
                )}
              />
            </div>
            <FieldDescription>{t("availableHint")}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="desc">{t("description")}</FieldLabel>
            <Textarea
              id="desc"
              rows={4}
              placeholder={t("descriptionPlaceholder")}
              {...register("desc")}
            />
          </Field>
        </section>

        {/* Amenities */}
        <section className="bg-card p-6">
          <h2 className="font-semibold mb-4">{t("amenities")}</h2>
          <AmenityPicker
            value={values.amenities}
            onChange={(next) => setField("amenities", next)}
          />
        </section>
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
                onClick={handleSubmit((v) => save(v, "active"))}
              >
                {isEdit ? t("publish.saveChanges") : t("publish.publish")}
              </Button>
              {!isEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center"
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
