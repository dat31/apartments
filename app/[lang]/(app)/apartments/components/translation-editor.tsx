"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { Globe, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routing, localeNames, type Locale } from "@/i18n/routing";
import { type ListingFormValues } from "@/schemas/listing";

/* Writing a home in another language.

   Additive, not tabbed: the original is the section above this one, and every
   other language is a block underneath it. That ordering is the promise the
   whole feature rests on — a second language is something an owner may add,
   never a half-finished tab sitting beside the one that matters, and never a
   condition of publishing.

   Two rules the fields here exist to keep:

   - A translation field never pre-fills with the owner's own words in another
     language. The original is shown above each field as a reference to work
     from; it is never dropped into the input, because that is how originals
     get overwritten.
   - Empty means "not written", never "the owner said nothing". Clearing a
     field restores the original for readers of that language, and the block
     says so before the owner finds out by saving. */
export function TranslationEditor({
  form,
  isLive,
}: {
  form: UseFormReturn<ListingFormValues>;
  /** This home is published — readers see a saved translation immediately. */
  isLive: boolean;
}) {
  const t = useTranslations("listingForm.languages");
  const tc = useTranslations("common");
  const uiLocale = useLocale() as Locale;
  const { control, register, setValue, getValues } = form;

  const [baseLocale, i18n, title, desc] = useWatch({
    control,
    name: ["baseLocale", "i18n", "title", "desc"],
  });

  const others = routing.locales.filter((l) => l !== baseLocale);
  const written = (locale: Locale) =>
    !!(i18n?.[locale]?.title.trim() || i18n?.[locale]?.desc.trim());

  /* Which blocks the owner has opened by hand. A block with writing in it is
     always open, so this only ever has to remember the empty ones — which
     also means a listing whose translations arrive after the first render
     (the edit page hydrates late) opens itself without an effect. */
  const [opened, setOpened] = React.useState<Locale[]>([]);
  const isOpen = (locale: Locale) => written(locale) || opened.includes(locale);
  const [confirming, setConfirming] = React.useState<Locale | null>(null);

  const set = (name: Parameters<typeof setValue>[0], value: unknown) =>
    setValue(name, value as never, { shouldDirty: true });

  /* Which language a home was written in is a fact about the owner, not a
     rule — some write English first. Correcting it is usually just a
     mislabel, so the copy stays where it is; but when the language being
     promoted already has writing of its own, the two swap places instead.
     Either way no one's words are lost or relabelled as someone else's. */
  const changeBase = (next: Locale) => {
    const current = getValues();
    if (written(next)) {
      set(`i18n.${current.baseLocale}`, {
        title: current.title,
        desc: current.desc,
      });
      set("title", current.i18n[next]?.title ?? "");
      set("desc", current.i18n[next]?.desc ?? "");
      set(`i18n.${next}`, { title: "", desc: "" });
    }
    set("baseLocale", next);
    setOpened((o) => o.filter((l) => l !== next));
  };

  /* Removing is one action away from deleting writing the owner may not be
     able to reproduce — hence the confirmation showing exactly what goes, and
     the undo behind it. */
  const remove = (locale: Locale) => {
    const previous = getValues(`i18n.${locale}`);
    set(`i18n.${locale}`, { title: "", desc: "" });
    setOpened((o) => o.filter((l) => l !== locale));
    setConfirming(null);
    toast.success(t("removed", { language: localeNames[locale] }), {
      action: {
        label: t("undo"),
        onClick: () => {
          set(`i18n.${locale}`, previous);
          setOpened((o) => (o.includes(locale) ? o : [...o, locale]));
        },
      },
    });
  };

  return (
    <section className="bg-card p-6 flex flex-col gap-5">
      <div>
        <h2 className="font-semibold">{t("heading")}</h2>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          {t("originalNote")}
        </p>
      </div>

      {/* The home's language and the language the owner happens to be using
          the site in are independent facts, and an owner browsing in one
          while editing a home written in the other needs telling that what
          they see is still their own words. */}
      {uiLocale !== baseLocale && (
        <p className="flex items-start gap-2 bg-secondary text-secondary-foreground px-3.5 py-2.5 text-[13px] leading-relaxed text-pretty">
          <Globe size={15} className="shrink-0 mt-0.5 text-muted-foreground" />
          {t("readerMismatch", {
            reader: tc(`languages.${uiLocale}`),
            original: localeNames[baseLocale],
          })}
        </p>
      )}

      <Field>
        <FieldLabel htmlFor="baseLocale">{t("writtenInLabel")}</FieldLabel>
        <Select value={baseLocale} onValueChange={(v) => changeBase(v as Locale)}>
          <SelectTrigger id="baseLocale" className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {routing.locales.map((locale) => (
              <SelectItem key={locale} value={locale}>
                {localeNames[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="flex flex-col gap-3">
        {others.map((locale) => {
          const language = localeNames[locale];

          if (!isOpen(locale)) {
            return (
              <div
                key={locale}
                className="bg-muted px-4 py-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <p className="text-sm text-muted-foreground text-pretty max-w-lg">
                  {t("readersSee", {
                    language,
                    original: localeNames[baseLocale],
                  })}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setOpened((o) => (o.includes(locale) ? o : [...o, locale]))
                  }
                >
                  <Plus size={16} /> {t("writeIn", { language })}
                </Button>
              </div>
            );
          }

          return (
            <div key={locale} className="bg-muted p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <p
                  lang={locale}
                  className="font-medium flex items-center gap-2"
                >
                  <Globe size={16} className="text-muted-foreground" />{" "}
                  {language}
                </p>
                {written(locale) && (
                  <button
                    type="button"
                    onClick={() => setConfirming(locale)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors focus-ring"
                  >
                    <Trash2 size={15} /> {t("remove", { language })}
                  </button>
                )}
              </div>

              {isLive && written(locale) && (
                <p className="text-[13px] text-muted-foreground">
                  {t("liveNow", { language })}
                </p>
              )}

              <Field>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">
                    {t("yourOriginal", {
                      language: localeNames[baseLocale],
                    })}
                  </span>{" "}
                  <span lang={baseLocale}>{title || "—"}</span>
                </p>
                <FieldLabel htmlFor={`title-${locale}`}>
                  {t("titleIn", { language })}
                </FieldLabel>
                <Input
                  id={`title-${locale}`}
                  lang={locale}
                  {...register(`i18n.${locale}.title`)}
                />
              </Field>

              <Field>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <span className="font-medium">
                    {t("yourOriginal", {
                      language: localeNames[baseLocale],
                    })}
                  </span>{" "}
                  <span lang={baseLocale}>{desc || "—"}</span>
                </p>
                <FieldLabel htmlFor={`desc-${locale}`}>
                  {t("descriptionIn", { language })}
                </FieldLabel>
                <Textarea
                  id={`desc-${locale}`}
                  rows={4}
                  lang={locale}
                  {...register(`i18n.${locale}.desc`)}
                />
                <FieldDescription>
                  {t("emptyMeans", {
                    language,
                    original: localeNames[baseLocale],
                  })}
                </FieldDescription>
              </Field>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!confirming}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("removeTitle", {
                language: confirming ? localeNames[confirming] : "",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("removeBody", {
                language: confirming ? localeNames[confirming] : "",
                original: localeNames[baseLocale],
              })}
            </DialogDescription>
          </DialogHeader>
          {/* What exactly disappears, in the owner's own words. */}
          {confirming && (
            <div
              lang={confirming}
              className="bg-secondary px-4 py-3 flex flex-col gap-2"
            >
              {i18n?.[confirming]?.title.trim() && (
                <p className="font-medium text-pretty">
                  {i18n[confirming].title}
                </p>
              )}
              {i18n?.[confirming]?.desc.trim() && (
                <p className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed text-pretty">
                  {i18n[confirming].desc}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => confirming && remove(confirming)}
            >
              {t("remove", {
                language: confirming ? localeNames[confirming] : "",
              })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
