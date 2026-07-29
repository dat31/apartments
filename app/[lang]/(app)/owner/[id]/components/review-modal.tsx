"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { StarPicker } from "./star-picker";
import { createReviewFormSchema, type ReviewFormValues } from "@/schemas/review";
import posthog from "posthog-js";

export function ReviewModal({
  open,
  onClose,
  firstName,
  authorName,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  firstName: string;
  /* The signed-in writer's display name. Shown instead of a name field —
     reviews are attributed to the poster's profile, not to free text. */
  authorName: string;
  /* Persists the review and reports whether it landed. Returning false keeps
     the dialog open so the writer doesn't lose what they typed — the caller
     has already surfaced the reason as a toast. */
  onSubmit: (data: ReviewFormValues) => Promise<boolean>;
}) {
  const t = useTranslations("owner.modal");
  const tv = useTranslations("validation");
  const reviewFormSchema = React.useMemo(
    () => createReviewFormSchema(tv),
    [tv]
  );
  const {
    handleSubmit,
    control,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, text: "" },
  });

  React.useEffect(() => {
    if (open) reset({ rating: 0, text: "" });
  }, [open, reset]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && !isSubmitting && onClose()}
    >
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t("title", { name: firstName })}
          </DialogTitle>
        </DialogHeader>
        <form
          className="px-6 pb-6 flex flex-col gap-5"
          onSubmit={handleSubmit(async (data) => {
            posthog.capture("owner_review_submitted", { rating: data.rating });
            if (await onSubmit(data)) onClose();
          })}
          noValidate
        >
          <p className="text-sm text-muted-foreground -mt-1 text-pretty">
            {t("intro", { name: firstName })}
          </p>

          <Field data-invalid={!!errors.rating}>
            <FieldLabel>{t("rating")}</FieldLabel>
            <Controller
              control={control}
              name="rating"
              render={({ field }) => (
                <StarPicker value={field.value} onChange={field.onChange} />
              )}
            />
            <FieldError errors={[errors.rating]} />
          </Field>

          <Field data-invalid={!!errors.text}>
            <FieldLabel htmlFor="text">{t("review")}</FieldLabel>
            <Textarea
              id="text"
              rows={4}
              placeholder={t("reviewPlaceholder")}
              className="bg-input border-transparent text-[15px] resize-none"
              aria-invalid={!!errors.text}
              {...register("text")}
            />
            <FieldError errors={[errors.text]} />
          </Field>

          <p className="text-xs text-muted-foreground -mt-1">
            {t("postingAs", { name: authorName })}
          </p>

          <Button
            size="lg"
            type="submit"
            className="w-full h-12"
            disabled={isSubmitting}
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
