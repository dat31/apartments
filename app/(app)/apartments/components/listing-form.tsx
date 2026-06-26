"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
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
  listingFormSchema,
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
        <ArrowLeft size={18} /> Back to dashboard
      </button>

      <h1 className="text-3xl font-semibold tracking-tight">
        {isEdit ? "Edit listing" : "New listing"}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {isEdit
          ? "Update the details below."
          : "Add the details of your place. You can save it as a draft."}
      </p>

      <form className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 lg:gap-8 items-start">
        <div className="flex flex-col gap-6 min-w-0">
        {/* Photos */}
        <section className="bg-card p-6">
          <h2 className="font-semibold mb-1">Photos</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Upload photos of your place. Drag to reorder — the first photo is
            used as the cover.
          </p>
          <PhotoUploader
            value={values.images}
            onChange={(next) => setField("images", next)}
          />
        </section>

        {/* Basics */}
        <section className="bg-card p-6 flex flex-col gap-5">
          <h2 className="font-semibold">The basics</h2>

          <Field data-invalid={!!errors.title}>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              placeholder="e.g. Sunlit studio near Mỹ Khê"
              aria-invalid={!!errors.title}
              {...register("title")}
            />
            <FieldError errors={errors.title ? [errors.title] : undefined} />
          </Field>

          <div className="grid sm:grid-cols-2 gap-5">
            <Field>
              <FieldLabel>Home type</FieldLabel>
              <Select
                value={values.type}
                onValueChange={(v) => setField("type", v)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field data-invalid={!!errors.price}>
              <FieldLabel htmlFor="price">Monthly price (USD)</FieldLabel>
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
              <FieldLabel>Bedrooms</FieldLabel>
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
                      {n === 0 ? "Studio" : n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Bathrooms</FieldLabel>
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
              <FieldLabel htmlFor="area">Area (m²)</FieldLabel>
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
            <FieldLabel>District</FieldLabel>
            <Select
              value={values.district}
              onValueChange={(v) => setField("district", v)}
            >
              <SelectTrigger
                className="w-full h-9"
                aria-invalid={!!errors.district}
              >
                <SelectValue placeholder="Select a district…" />
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
            <FieldLabel>Available from</FieldLabel>
            <div className="flex flex-wrap items-center gap-3">
              <Chip
                className="h-8"
                active={values.available === "now"}
                onClick={() => setField("available", "now")}
              >
                <Clock size={16} /> Now
              </Chip>
              <span className="text-sm text-muted-foreground">or</span>
              <DatePicker
                min={today || undefined}
                placeholder="Pick a date"
                value={values.available === "now" ? undefined : values.available}
                onChange={(v) => setField("available", v || "now")}
                className={cn(
                  values.available !== "now" &&
                    values.available &&
                    "ring-2 ring-primary"
                )}
              />
            </div>
            <FieldDescription>When can a renter move in?</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="desc">Description</FieldLabel>
            <Textarea
              id="desc"
              rows={4}
              placeholder="Describe the light, the layout, the neighborhood…"
              {...register("desc")}
            />
          </Field>
        </section>

        {/* Amenities */}
        <section className="bg-card p-6">
          <h2 className="font-semibold mb-4">Amenities</h2>
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
                {isEdit ? "Save changes" : "Ready to publish?"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isEdit
                  ? "Your edits go live as soon as you save."
                  : "Publish to list it now, or keep it as a draft to finish later."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                className="w-full justify-center"
                onClick={handleSubmit((v) => save(v, "active"))}
              >
                {isEdit ? "Save changes" : "Publish listing"}
              </Button>
              {!isEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full justify-center"
                  onClick={handleSubmit((v) => save(v, "draft"))}
                >
                  Save as draft
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-center"
                onClick={() => router.push(DASHBOARD)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
