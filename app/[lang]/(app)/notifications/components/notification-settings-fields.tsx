"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";
import { CATEGORY_ICONS } from "@/components/notifications/kind-meta";
import { NOTIFICATION_CATEGORIES } from "@/schemas/notification";

/* The switches themselves, split from the shell around them.

   Not an arbitrary division: Radix mounts a dialog's content only once it is
   open, so keeping the preferences query in here is what stops it running for
   everyone who loads the page and never opens settings. The shell renders the
   trigger and must therefore always be mounted; this must not be.

   Saves on flip rather than behind a Done button: there is one control per row
   and no validation to run, so a confirm step would only add a way to lose the
   change. The footer button closes, and says so. */
export function NotificationSettingsFields() {
  const t = useTranslations("notifications.settings");
  const { preferences, setCategory, ready } = useNotificationPreferences();

  return (
    /* Flat: no rules between the rows and none under the last one. Three
       labelled switches are already three things — a line between each pair
       only draws the eye to the gaps. Spacing does the separating. */
    <div className="flex flex-col gap-5 px-6 pb-2">
      {NOTIFICATION_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category];
        return (
          <div key={category} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="inline-grid size-9 shrink-0 place-items-center bg-secondary text-primary"
            >
              <Icon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{t(`${category}.label`)}</p>
              <p className="text-sm text-pretty text-muted-foreground">
                {t(`${category}.hint`)}
              </p>
            </div>
            <Switch
              className="mt-1 shrink-0"
              checked={preferences[category]}
              // Disabled only until the real values land, so nothing can be
              // flipped from a default the server never confirmed.
              disabled={!ready}
              onCheckedChange={(checked) => setCategory(category, checked)}
              aria-label={t(`${category}.label`)}
            />
          </div>
        );
      })}

      {/* The honest note about what "off" does, which is the one thing a
          reader cannot see from the switches: nothing is lost. */}
      <p className="text-sm text-pretty text-muted-foreground">
        {t("mutedNote")}
      </p>
    </div>
  );
}
