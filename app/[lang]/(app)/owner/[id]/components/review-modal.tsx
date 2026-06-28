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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { FILLED_INPUT } from "@/app/[lang]/(auth)/components/password-field";
import { StarPicker } from "./star-picker";
import { reviewFormSchema, type ReviewFormValues } from "@/schemas/review";

export function ReviewModal({
  open,
  onClose,
  firstName,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  firstName: string;
  onSubmit: (data: ReviewFormValues) => void;
}) {
  const t = useTranslations("owner.modal");
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, author: "", text: "" },
  });

  React.useEffect(() => {
    if (open) reset({ rating: 0, author: "", text: "" });
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t("title", { name: firstName })}
          </DialogTitle>
        </DialogHeader>
        <form
          className="px-6 pb-6 flex flex-col gap-5"
          onSubmit={handleSubmit((data) => {
            onSubmit(data);
            onClose();
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

          <Field data-invalid={!!errors.author}>
            <FieldLabel htmlFor="author">{t("name")}</FieldLabel>
            <Input
              id="author"
              placeholder={t("namePlaceholder")}
              className={FILLED_INPUT}
              aria-invalid={!!errors.author}
              {...register("author")}
            />
            <FieldError errors={[errors.author]} />
          </Field>

          <Field data-invalid={!!errors.text}>
            <FieldLabel htmlFor="text">{t("review")}</FieldLabel>
            <Textarea
              id="text"
              rows={4}
              placeholder={t("reviewPlaceholder")}
              className="bg-input border-transparent text-[15px] resize-none focus-ring"
              aria-invalid={!!errors.text}
              {...register("text")}
            />
            <FieldError errors={[errors.text]} />
          </Field>

          <Button size="lg" type="submit" className="w-full h-12">
            {t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
