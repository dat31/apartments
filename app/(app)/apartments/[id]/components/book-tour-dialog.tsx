"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/use-profile";
import { useTours } from "@/hooks/use-tours";
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
import { SocialButton } from "@/app/(auth)/components/social-button";
import { AuthDivider } from "@/app/(auth)/components/auth-divider";
import { FILLED_INPUT } from "@/app/(auth)/components/password-field";
import { Calendar, ChevronLeft, ChevronRight, CircleCheck, Clock, ShieldCheck } from "lucide-react";
import { GoogleMark } from "@/components/icons";
import { PALETTE, money } from "@/lib/data/listings";
import { districtLabel, type Listing } from "@/schemas/listing";
import { acctInitials } from "@/lib/data/profile";
import {
  type TourBookingValues,
  type TourSignInValues,
  tourBookingSchema,
  tourSignInSchema,
} from "@/schemas/tour";
import {
  availabilityFor,
  occupiedSet,
  openSlotsFor,
  todayYmd,
  tourDateLong,
  tourDateMed,
  tourTimeLabel,
} from "../constants/tours";
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
  const isMobile = useIsMobile();
  const { profile, updateProfile } = useProfile();
  const { tours, addTour } = useTours();

  const ownerKey = listing.owner;
  const template = React.useMemo(() => availabilityFor(ownerKey), [ownerKey]);
  const occupied = React.useMemo(
    () => occupiedSet(tours, ownerKey),
    [tours, ownerKey]
  );
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
    const signedIn = !!(profile.name.trim() && profile.email.trim());
    setAuthed(signedIn);
    form.reset({
      name: profile.name,
      email: profile.email,
      password: "",
    });
  }, [open, profile.name, profile.email, form, booking]);

  const slots = date ? openSlotsFor(template, date, occupied) : [];

  const signIn = form.handleSubmit((values) => {
    updateProfile({ name: values.name, email: values.email });
    setAuthed(true);
  });

  const google = () => {
    const name = form.getValues("name").trim() || "Jordan Rivera";
    const email = form.getValues("email").trim() || "you@gmail.com";
    updateProfile({ name, email });
    form.setValue("name", name);
    form.setValue("email", email);
    setAuthed(true);
  };

  const confirm = () => {
    const values = booking.getValues();
    addTour({
      listingId: listing.id,
      ownerKey,
      date: values.date,
      time: values.time,
      moveIn: values.moveIn || undefined,
      people: values.people || undefined,
      note: (values.note ?? "").trim(),
      renterName: form.getValues("name").trim() || profile.name,
      renterEmail: form.getValues("email").trim() || profile.email,
    });
    toast.success("Tour requested", {
      description: `${tourDateMed(values.date)} at ${tourTimeLabel(values.time)} — the owner will confirm shortly.`,
    });
    setStep("done");
  };

  // Validate the date/time selection before moving to the verify step.
  const goVerify = booking.handleSubmit(() => setStep("verify"));

  const title =
    step === "done" ? "Tour requested" : step === "pick" ? "Book a tour" : "Confirm your tour";

  const listingHeader = (
    <div className="flex items-center gap-3 bg-secondary p-3 mb-5">
      <span className="w-12 h-12 shrink-0" style={{ background: colors[0] }} />
      <div className="min-w-0">
        <p className="font-medium truncate">{listing.title}</p>
        <p className="text-sm text-muted-foreground">
          {districtLabel(listing.district)} · {money(listing.price)}/mo
        </p>
      </div>
    </div>
  );

  const body =
    step === "done" ? (
      <div className="text-center py-6 anim-fade">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground mb-4">
          <Calendar size={30} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight">Tour requested</h3>
        <p className="mt-2 text-muted-foreground text-pretty max-w-sm mx-auto">
          We&apos;ve sent your request for{" "}
          <span className="text-foreground font-medium">{tourDateLong(date)}</span>{" "}
          at{" "}
          <span className="text-foreground font-medium">{tourTimeLabel(time)}</span>
          . The owner will confirm shortly — you&apos;ll get an email once they
          respond.
        </p>
        <Button className="mt-6 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    ) : step === "pick" ? (
      <div className="anim-fade">
        {listingHeader}
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
              <Calendar size={14} /> Pick a date
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
              <Clock size={14} /> {date ? tourDateMed(date) : "Available times"}
            </h4>
            {date ? (
              <TimeSlots
                slots={slots}
                value={time}
                onPick={(t) =>
                  booking.setValue("time", t, { shouldValidate: true })
                }
              />
            ) : (
              <div className="bg-card p-6 text-sm text-muted-foreground text-center">
                Select a highlighted day to see open tour times.
              </div>
            )}
            {date && time && (
              <div className="mt-4 flex flex-col gap-4 anim-fade">
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="tour-movein">
                      Move-in date (optional)
                    </FieldLabel>
                    <DatePicker
                      id="tour-movein"
                      value={booking.watch("moveIn") || undefined}
                      onChange={(v) =>
                        booking.setValue("moveIn", v ?? "")
                      }
                      min={todayYmd()}
                      placeholder="Pick a date"
                      className="w-full"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="tour-people">
                      People (optional)
                    </FieldLabel>
                    <Select
                      value={booking.watch("people")}
                      onValueChange={(v) => booking.setValue("people", v)}
                    >
                      <SelectTrigger
                        id="tour-people"
                        className="w-full bg-input border-transparent h-10"
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 person</SelectItem>
                        <SelectItem value="2">2 people</SelectItem>
                        <SelectItem value="3">3 people</SelectItem>
                        <SelectItem value="4">4 people</SelectItem>
                        <SelectItem value="5+">5 or more</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="tour-note">Add a note (optional)</FieldLabel>
                  <Textarea
                    id="tour-note"
                    rows={2}
                    placeholder="Anything you'd like the owner to know?"
                    className="bg-input border-transparent text-[15px] resize-none focus-ring"
                    {...booking.register("note")}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {time ? `${tourDateMed(date)} · ${tourTimeLabel(time)}` : "No time selected"}
          </p>
          <Button
            className="gap-1.5"
            disabled={!date || !time}
            onClick={goVerify}
          >
            Continue <ChevronRight size={18} />
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
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2.5 bg-secondary p-3 mb-5 text-sm">
          <Calendar size={18} className="text-primary shrink-0" />
          <span className="font-medium">{tourDateLong(date)}</span>
          <span className="text-muted-foreground">at {tourTimeLabel(time)}</span>
        </div>

        {!authed ? (
          <form className="flex flex-col gap-4" onSubmit={signIn} noValidate>
            <h4 className="font-semibold flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" /> Sign in to book
            </h4>
            <SocialButton icon={<GoogleMark />} onClick={google}>
              Continue with Google
            </SocialButton>
            <AuthDivider>or</AuthDivider>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="tour-name">Full name</FieldLabel>
              <Input
                id="tour-name"
                placeholder="Jordan Rivera"
                className={FILLED_INPUT}
                aria-invalid={!!form.formState.errors.name}
                {...form.register("name")}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.email}>
              <FieldLabel htmlFor="tour-email">Email</FieldLabel>
              <Input
                id="tour-email"
                type="email"
                placeholder="you@email.com"
                className={FILLED_INPUT}
                aria-invalid={!!form.formState.errors.email}
                {...form.register("email")}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field data-invalid={!!form.formState.errors.password}>
              <FieldLabel htmlFor="tour-password">Password</FieldLabel>
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
            <Button type="submit" size="lg">
              Sign in
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
                <CircleCheck size={15} /> Signed in
              </span>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground mb-2">
                Verify you&apos;re human
              </h4>
              <RecaptchaCheck checked={robot} onChange={setRobot} />
            </div>
            <Button size="lg" className="gap-2" disabled={!robot} onClick={confirm}>
              <Calendar size={18} /> Confirm tour request
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              The owner will accept, decline, or suggest another time.
            </p>
          </div>
        )}
      </div>
    );

  const description =
    step === "pick"
      ? `Choose a day and time to tour ${listing.title}.`
      : step === "verify"
        ? "Confirm your details to send the request."
        : "Your tour request has been sent.";

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
