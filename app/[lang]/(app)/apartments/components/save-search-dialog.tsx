"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Bell, BellOff, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/hooks/auth";
import { cn } from "@/lib/utils";
import { FILLED_INPUT } from "@/app/[lang]/(auth)/components/password-field";
import {
  createSaveSearchSchema,
  SAVED_SEARCH_MAX,
  type SaveSearchValues,
} from "@/schemas/saved-search";
import { type Filters } from "@/schemas/filters";
import { filtersToQuery } from "../lib/saved-search";
import { useSavedSearches } from "../hooks/use-saved-searches";
import { useDescribeSearch } from "../hooks/use-describe-search";
import { AlertToggle } from "./alert-toggle";
import { FilterChips } from "./filter-chips";

/* Save confirmation: auto-generated (editable) name plus the email-alerts
   toggle. At the cap it becomes a "delete one first" notice instead of a
   form. Dialog on desktop, Drawer on mobile — same split as book-tour. */
export function SaveSearchDialog({
  open,
  onClose,
  filters,
}: {
  open: boolean;
  onClose: () => void;
  filters: Filters;
}) {
  const t = useTranslations("apartments.savedSearches.dialog");
  const tv = useTranslations("validation");
  const isMobile = useIsMobile();
  const { data: user } = useUser();
  const { addSearch, adding, atCap } = useSavedSearches();
  const describe = useDescribeSearch();
  const [alerts, setAlerts] = React.useState(true);

  const { name: autoName, chips } = React.useMemo(
    () => describe(filters),
    [describe, filters]
  );

  // The parent mounts this dialog fresh on every open (see SaveSearch), so
  // the auto-generated name lands via defaultValues — no re-seeding effect.
  const schema = React.useMemo(() => createSaveSearchSchema(tv), [tv]);
  const form = useForm<SaveSearchValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: autoName },
  });

  const submit = form.handleSubmit(async ({ name }) => {
    try {
      await addSearch({
        name: name.trim() || autoName,
        queryString: filtersToQuery(filters),
        alerts,
      });
      toast.success(t("savedToast"));
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error && err.message.includes("saved_search_cap_reached")
          ? t("capToast")
          : t("errorToast")
      );
    }
  });

  const body = atCap ? (
    <div className="py-2 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center bg-secondary text-primary">
        <Bookmark size={26} />
      </div>
      <h3 className="text-lg font-semibold">
        {t("capHeading", { max: SAVED_SEARCH_MAX })}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-pretty text-muted-foreground">
        {t("capBody")}
      </p>
    </div>
  ) : (
    <form
      id="save-search-form"
      className="flex flex-col gap-5"
      onSubmit={submit}
      noValidate
    >
      <Field data-invalid={!!form.formState.errors.name}>
        <FieldLabel htmlFor="save-search-name">{t("nameLabel")}</FieldLabel>
        <Input
          id="save-search-name"
          maxLength={80}
          placeholder={t("namePlaceholder")}
          className={FILLED_INPUT}
          {...form.register("name")}
        />
        <FieldDescription>{t("nameHint")}</FieldDescription>
        <FieldError errors={[form.formState.errors.name]} />
      </Field>

      {chips.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("summaryHeading")}
          </p>
          <FilterChips chips={chips} />
        </div>
      )}

      <div className="flex items-start gap-3 bg-secondary p-4">
        <span
          className={cn(
            "mt-0.5 shrink-0",
            alerts ? "text-primary" : "text-muted-foreground"
          )}
        >
          {alerts ? <Bell size={18} /> : <BellOff size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("alertsLabel")}</p>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">
            {alerts ? (
              <>
                {t.rich("alertsOnHint", {
                  email: () => (
                    <span className="break-all font-medium text-foreground">
                      {user?.email}
                    </span>
                  ),
                })}
              </>
            ) : (
              t("alertsOffHint")
            )}
          </p>
        </div>
        <AlertToggle
          on={alerts}
          onClick={() => setAlerts((v) => !v)}
          className="shrink-0"
        />
      </div>
    </form>
  );

  const footer = atCap ? (
    <Button variant="secondary" onClick={onClose}>
      {t("capClose")}
    </Button>
  ) : (
    <>
      <Button variant="ghost" onClick={onClose}>
        {t("cancel")}
      </Button>
      <Button type="submit" form="save-search-form" disabled={adding}>
        <Bookmark size={16} /> {t("confirm")}
      </Button>
    </>
  );

  const title = atCap ? t("capTitle") : t("title");
  const description = atCap ? t("capBody") : t("description");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">{body}</div>
          <DrawerFooter className="flex-row justify-end">{footer}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
