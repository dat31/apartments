"use client";

import * as React from "react";
import { useTranslations, useFormatter } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/use-profile";
import { useUser, useSignIn } from "@/hooks/auth";
import { useBookTour } from "@/hooks/use-book-tour";
import { useActiveTour } from "@/hooks/use-active-tour";
import { Link } from "@/i18n/navigation";
import { StatusTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { FILLED_INPUT } from "@/app/[lang]/(auth)/components/password-field";
import { Calendar, ChevronLeft, ChevronRight, CircleCheck, Clock, ShieldCheck } from "lucide-react";
import { PALETTE } from "@/lib/data/listings";
import { useMoney } from "@/hooks/use-money";
import { districtLabel, type Listing } from "@/schemas/listing";
import { acctInitials } from "@/lib/data/profile";
import {
  type TourBookingValues,
  type TourSignInValues,
  createTourBookingSchema,
  createTourSignInSchema,
} from "@/schemas/tour";
import { openSlotsFor, parseYmd, todayYmd } from "../constants/tours";
import { useAvailability } from "@/hooks/use-availability";
import { OWNER_ID_BY_KEY } from "@/lib/services/listings-map";
import { DatePicker } from "@/components/ui/date-picker";
import { MonthCalendar } from "./month-calendar";
import { TimeSlots } from "./time-slots";
import { RecaptchaCheck } from "./recaptcha-check";

type Step = "pick" | "verify" | "done";

export function BookTourDialog({
  open,
  onClose,
  listing,
}: {
  open: boolean;
  onClose: () => void;
  listing: Listing;
}) {
  const t = useTranslations("tours");
  const tv = useTranslations("validation");
  const tourBookingSchema = React.useMemo(
    () => createTourBookingSchema(tv),
    [tv]
  );
  const tourSignInSchema = React.useMemo(
    () => createTourSignInSchema(tv),
    [tv]
  );
  const format = useFormatter();
  const money = useMoney();
  const fmtDateLong = (s: string) =>
    format.dateTime(parseYmd(s), {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  const fmtDateMed = (s: string) =>
    format.dateTime(parseYmd(s), {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  const fmtTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return format.dateTime(new Date(2000, 0, 1, h, m), {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const { data: user } = useUser();
  const signInMutation = useSignIn();
  const bookTour = useBookTour();
  // Safety net: if a live tour for this home already exists, the pick step is
  // replaced with an "already booked" surface (the CTA usually prevents opening
  // the dialog at all, but this guards the race where its data was stale).
  const { tour: existingTour } = useActiveTour(listing.id);

  // listing.owner is the owner key ("you"/"maya"/…) for seed owners, otherwise
  // the raw uuid; map it back to the uuid to read that owner's availability.
  const ownerId = OWNER_ID_BY_KEY[listing.owner] ?? listing.owner;
  const { template } = useAvailability(ownerId);
  // A cross-renter occupied set would need visibility the renter's RLS scope
  // doesn't grant, so we show the owner's weekly template and let the DB be the
  // source of truth (the one-active-per-listing index) when the tour inserts.
  const occupied = React.useMemo(() => new Set<string>(), []);
  const colors = PALETTE[listing.palette];

  const [step, setStep] = React.useState<Step>("pick");
  const [authed, setAuthed] = React.useState(false);
  const [robot, setRobot] = React.useState(false);

  const booking = useForm<TourBookingValues>({
    resolver: zodResolver(tourBookingSchema),
    defaultValues: { date: "", time: "", moveIn: "", people: "", note: "" },
  });
  const date = booking.watch("date");
  const time = booking.watch("time");

  const form = useForm<TourSignInValues>({
    resolver: zodResolver(tourSignInSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  // Reset the whole flow each time the dialog opens.
  React.useEffect(() => {
    if (!open) return;
    booking.reset({ date: "", time: "", moveIn: "", people: "", note: "" });
    setStep("pick");
    setRobot(false);
    setAuthed(!!user);
    form.reset({
      name: profile.name,
      email: profile.email,
      password: "",
    });
  }, [open, user, profile.name, profile.email, form, booking]);

  const slots = date ? openSlotsFor(template, date, occupied) : [];

  const signIn = form.handleSubmit(async (values) => {
    try {
      await signInMutation.mutateAsync({
        email: values.email,
        password: values.password,
        remember: true,
      });
      setAuthed(true);
    } catch {
      form.setError("password", { message: t("signInError") });
    }
  });

  const confirm = async () => {
    const values = booking.getValues();
    try {
      await bookTour.mutateAsync({
        listing,
        date: values.date,
        time: values.time,
        moveIn: values.moveIn || undefined,
        people: values.people || undefined,
        note: (values.note ?? "").trim(),
        renterName: form.getValues("name").trim() || profile.name,
        renterEmail: form.getValues("email").trim() || profile.email,
      });
    } catch (e) {
      // Unique-index race: a live tour for this home already exists. Surface it
      // softly and close — the detail-page CTA refetches into the guard state.
      if ((e as { code?: string })?.code === "23505") {
        toast(t("alreadyToast"));
        onClose();
        return;
      }
      toast.error(t("bookError"));
      return;
    }
    // Success is shown by the dialog's "done" step — no toast (it would double
    // up with the confirmation screen). The user closes the dialog themselves.
    setStep("done");
  };

  // Validate the date/time selection before moving to the verify step.
  const goVerify = booking.handleSubmit(() => setStep("verify"));

  // Show the already-booked surface at the entry (pick) step when a live tour
  // for this home exists.
  const showGuard = !!existingTour && step === "pick";
  const guardState = existingTour
    ? existingTour.status === "confirmed"
      ? t("alreadyState.confirmed")
      : existingTour.status === "reschedule"
        ? t("alreadyState.reschedule")
        : t("alreadyState.pending")
    : "";

  const title = showGuard
    ? t("alreadyTitle")
    : step === "done"
      ? t("titleDone")
      : step === "pick"
        ? t("titlePick")
        : t("titleVerify");

  const listingHeader = (
    <div className="flex items-center gap-3 bg-secondary p-3 mb-5">
      <span className="w-12 h-12 shrink-0" style={{ background: colors[0] }} />
      <div className="min-w-0">
        <p className="font-medium truncate">{listing.title}</p>
        <p className="text-sm text-muted-foreground">
          {districtLabel(listing.district)} · {money(listing.price)}
          {t("perMonthShort")}
        </p>
      </div>
    </div>
  );

  const guardBody = existingTour ? (
    <div className="anim-fade">
      {listingHeader}
      <div className="flex flex-col items-center text-center py-1">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary text-primary mb-4">
          <CircleCheck size={28} />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">
          {t("alreadyHeading")}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground text-pretty max-w-sm">
          {t.rich("alreadyBody", {
            state: guardState,
            date: fmtDateLong(existingTour.date),
            time: fmtTime(existingTour.time),
            s: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
            d: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
            t: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
          })}
        </p>
        <div className="mt-4">
          <StatusTag status={existingTour.status} />
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <Button asChild className="flex-1">
          <Link href="/tour">
            <Calendar size={18} /> {t("alreadyManage")}
          </Link>
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          {t("alreadyClose")}
        </Button>
      </div>
    </div>
  ) : null;

  const body = showGuard ? (
    guardBody
  ) : step === "done" ? (
      <div className="text-center py-6 anim-fade">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground mb-4">
          <Calendar size={30} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">
          {t("requestedTitle")}
        </h3>
        <p className="mt-2 text-muted-foreground text-pretty max-w-sm mx-auto">
          {t.rich("requestedBody", {
            date: fmtDateLong(date),
            time: fmtTime(time),
            d: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
            t: (chunks) => (
              <span className="text-foreground font-medium">{chunks}</span>
            ),
          })}
        </p>
        <Button className="mt-6 w-full" onClick={onClose}>
          {t("done")}
        </Button>
      </div>
    ) : step === "pick" ? (
      <div className="anim-fade">
        {listingHeader}
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar size={14} /> {t("pickDate")}
            </h4>
            <MonthCalendar
              template={template}
              occupied={occupied}
              selected={date}
              onSelect={(d) => {
                booking.setValue("date", d, { shouldValidate: true });
                booking.setValue("time", "");
              }}
            />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock size={14} /> {date ? fmtDateMed(date) : t("availableTimes")}
            </h4>
            {date ? (
              <TimeSlots
                slots={slots}
                value={time}
                onPick={(slot) =>
                  booking.setValue("time", slot, { shouldValidate: true })
                }
              />
            ) : (
              <div className="bg-card p-6 text-sm text-muted-foreground text-center">
                {t("selectDayHint")}
              </div>
            )}
            {date && time && (
              <div className="mt-4 flex flex-col gap-4 anim-fade">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="tour-movein">
                      {t("moveInLabel")}
                    </FieldLabel>
                    <DatePicker
                      id="tour-movein"
                      value={booking.watch("moveIn") || undefined}
                      onChange={(v) =>
                        booking.setValue("moveIn", v ?? "")
                      }
                      min={todayYmd()}
                      placeholder={t("moveInPlaceholder")}
                      className="w-full"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="tour-people">
                      {t("peopleLabel")}
                    </FieldLabel>
                    <Select
                      value={booking.watch("people")}
                      onValueChange={(v) => booking.setValue("people", v)}
                    >
                      <SelectTrigger
                        id="tour-people"
                        className="w-full bg-input border-transparent h-10"
                      >
                        <SelectValue placeholder={t("peopleSelect")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t("people", { count: 1 })}</SelectItem>
                        <SelectItem value="2">{t("people", { count: 2 })}</SelectItem>
                        <SelectItem value="3">{t("people", { count: 3 })}</SelectItem>
                        <SelectItem value="4">{t("people", { count: 4 })}</SelectItem>
                        <SelectItem value="5+">{t("peopleMax")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="tour-note">{t("noteLabel")}</FieldLabel>
                  <Textarea
                    id="tour-note"
                    rows={2}
                    placeholder={t("notePlaceholder")}
                    className="bg-input border-transparent text-[15px] resize-none"
                    {...booking.register("note")}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {time
              ? `${fmtDateMed(date)} · ${fmtTime(time)}`
              : t("noTimeSelected")}
          </p>
          <Button
            className="gap-1.5"
            disabled={!date || !time}
            onClick={goVerify}
          >
            {t("continue")} <ChevronRight size={18} />
          </Button>
        </div>
      </div>
    ) : (
      <div className="anim-fade">
        <button
          type="button"
          onClick={() => setStep("pick")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4 focus-ring"
        >
          <ChevronLeft size={16} /> {t("back")}
        </button>
        <div className="flex items-center gap-2.5 bg-secondary p-3 mb-5 text-sm">
          <Calendar size={18} className="text-primary shrink-0" />
          <span className="font-medium">{fmtDateLong(date)}</span>
          <span className="text-muted-foreground">
            {t("at", { time: fmtTime(time) })}
          </span>
        </div>

        {!authed ? (
          <form className="flex flex-col gap-4" onSubmit={signIn} noValidate>
            <h4 className="font-semibold flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" /> {t("signInToBook")}
            </h4>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="tour-name">{t("fullName")}</FieldLabel>
              <Input
                id="tour-name"
                placeholder={t("fullNamePlaceholder")}
                className={FILLED_INPUT}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="tour-email">{t("email")}</FieldLabel>
              <Input
                id="tour-email"
                type="email"
                placeholder={t("emailPlaceholder")}
                className={FILLED_INPUT}
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="tour-password">{t("password")}</FieldLabel>
              <Input
                id="tour-password"
                type="password"
                placeholder="••••••••"
                className={FILLED_INPUT}
                aria-invalid={!!form.formState.errors.password}
                {...form.register("password")}
              />
              <FieldError errors={[form.formState.errors.password]} />
            </Field>
            <Button type="submit" size="lg" disabled={signInMutation.isPending}>
              {t("signIn")}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-card p-3">
              <span className="inline-flex items-center justify-center w-10 h-10 bg-primary text-primary-foreground font-semibold text-sm">
                {acctInitials(form.getValues("name") || profile.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">
                  {form.getValues("name") || profile.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {form.getValues("email") || profile.email}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <CircleCheck size={15} /> {t("signedIn")}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                {t("verifyHuman")}
              </h4>
              <RecaptchaCheck checked={robot} onChange={setRobot} />
            </div>
            <Button
              size="lg"
              className="gap-2"
              disabled={!robot || bookTour.isPending}
              onClick={confirm}
            >
              <Calendar size={18} /> {t("confirmRequest")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t("ownerWillRespond")}
            </p>
          </div>
        )}
      </div>
    );

  const description = showGuard
    ? t("alreadyHeading")
    : step === "pick"
      ? t("descPick", { title: listing.title })
      : step === "verify"
        ? t("descVerify")
        : t("descDone");

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">{title}</DrawerTitle>
            <DrawerDescription className="sr-only">{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 max-h-[88vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </DialogHeader>
        <div className="px-6 pt-5 pb-6 overflow-y-auto">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
