"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createNoteFormSchema, type NoteFormValues } from "@/schemas/virtual-tour";

/* What a host writes on a point of interest.

   Both fields are required, which is why a freshly placed note is not saved
   until this is filled in: a marker that says nothing costs a renter a tap
   and tells them nothing. The words themselves are the host's — written in
   whatever language they write, and never translated. */
export function NoteForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial?: NoteFormValues;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: NoteFormValues) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("virtualTourEditor");
  const tv = useTranslations("validation");
  const schema = React.useMemo(() => createNoteFormSchema(tv), [tv]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { label: "", body: "" },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={handleSubmit((values) => onSubmit(values))}
    >
      <Field data-invalid={!!errors.label}>
        <FieldLabel htmlFor="note-title">{t("noteTitle")}</FieldLabel>
        <Input
          id="note-title"
          autoFocus
          maxLength={80}
          placeholder={t("noteTitlePlaceholder")}
          aria-invalid={!!errors.label}
          {...register("label")}
        />
        {errors.label && <FieldError errors={[errors.label]} />}
      </Field>

      <Field data-invalid={!!errors.body}>
        <FieldLabel htmlFor="note-body">{t("noteBody")}</FieldLabel>
        <Textarea
          id="note-body"
          rows={3}
          maxLength={400}
          placeholder={t("noteBodyPlaceholder")}
          aria-invalid={!!errors.body}
          {...register("body")}
        />
        {errors.body && <FieldError errors={[errors.body]} />}
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
