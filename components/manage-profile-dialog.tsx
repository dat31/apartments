"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { ProfileAvatar } from "@/components/profile-avatar";
import { FILLED_INPUT } from "@/app/[lang]/(auth)/components/password-field";
import { Check } from "lucide-react";
import { PALETTE } from "@/lib/data/listings";
import {
  type Profile,
  type ManageProfileValues,
  manageProfileSchema,
} from "@/schemas/profile";

export function ManageProfileDialog({
  open,
  onClose,
  profile,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  onSave: (data: ManageProfileValues) => void;
}) {
  const t = useTranslations("profile");
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ManageProfileValues>({
    resolver: zodResolver(manageProfileSchema),
    defaultValues: {
      name: profile.name,
      email: profile.email,
      location: profile.location,
      bio: profile.bio,
      palette: profile.palette,
    },
  });

  React.useEffect(() => {
    if (open)
      reset({
        name: profile.name,
        email: profile.email,
        location: profile.location,
        bio: profile.bio,
        palette: profile.palette,
      });
  }, [open, profile, reset]);

  const name = watch("name");
  const location = watch("location");
  const palette = watch("palette");
  const roleLabel = profile.role === "owner" ? t("owner") : t("renter");
  const isMobile = useIsMobile();

  const body = (
    <form
      className="px-6 pb-6 flex flex-col gap-5 overflow-y-auto"
      onSubmit={handleSubmit((data) => {
        onSave(data);
        onClose();
      })}
      noValidate
    >
          {/* preview */}
          <div className="flex items-center gap-4 bg-muted px-4 py-4">
            <ProfileAvatar name={name} palette={palette} size={56} />
            <div className="min-w-0">
              <p className="font-semibold leading-tight truncate">
                {name?.trim() || t("yourName")}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {roleLabel}
                {location?.trim() ? ` · ${location.trim()}` : ""}
              </p>
            </div>
          </div>

          <Field>
            <FieldLabel>{t("avatarColor")}</FieldLabel>
            <Controller
              control={control}
              name="palette"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((p, i) => {
                    const sel = i === field.value;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => field.onChange(i)}
                        aria-label={t("colorAria", { n: i + 1 })}
                        aria-pressed={sel}
                        className={cn(
                          "w-9 h-9 grid place-items-center transition-transform focus-ring active:scale-90",
                          sel &&
                            "ring-2 ring-foreground ring-offset-2 ring-offset-popover"
                        )}
                        style={{ background: p[0] }}
                      >
                        {sel && <Check size={18} className="text-background" />}
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="name">{t("fullName")}</FieldLabel>
              <Input
                id="name"
                placeholder={t("fullNamePlaceholder")}
                className={FILLED_INPUT}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                className={FILLED_INPUT}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              <FieldError errors={[errors.email]} />
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="location">{t("location")}</FieldLabel>
            <Input
              id="location"
              placeholder={t("locationPlaceholder")}
              className={FILLED_INPUT}
              {...register("location")}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="bio">{t("about")}</FieldLabel>
            <Textarea
              id="bio"
              rows={4}
              placeholder={t("aboutPlaceholder")}
              className="bg-input border-transparent text-[15px] resize-none focus-ring"
              {...register("bio")}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={onClose}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" className="h-11 gap-2">
              <Check size={18} /> {t("save")}
            </Button>
          </div>
        </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="px-6 pt-2 pb-4 text-left">
            <DrawerTitle className="text-xl font-semibold tracking-tight">
              {t("title")}
            </DrawerTitle>
          </DrawerHeader>
          {body}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
