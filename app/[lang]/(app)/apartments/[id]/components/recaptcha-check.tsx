"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

/* Faux Google reCAPTCHA "I'm not a robot" checkbox. Brand-exact colors are
   intentionally inline — this replicates a third-party widget, not our theme. */
export function RecaptchaCheck({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTranslations("tours");
  const [loading, setLoading] = React.useState(false);

  const click = () => {
    if (checked || loading) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onChange(true);
    }, 850);
  };

  return (
    <div
      style={{ background: "#f9f9f9", border: "1px solid #d3d3d3", color: "#222" }}
      className="flex items-center justify-between px-3.5 py-3 w-full max-w-[300px]"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={click}
          aria-label={t("notRobot")}
          className="relative w-7 h-7 inline-flex items-center justify-center"
          style={{ background: "#fff", border: "2px solid #c1c1c1" }}
        >
          {loading && (
            <span
              className="absolute inset-0 m-auto w-5 h-5 animate-spin"
              style={{
                border: "3px solid #4285f4",
                borderTopColor: "transparent",
                borderRadius: "9999px",
              }}
            />
          )}
          {checked && !loading && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1b9e3e"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5 10 17l9-10" />
            </svg>
          )}
        </button>
        <span className="text-[14px]" style={{ color: "#222" }}>
          {t("notRobot")}
        </span>
      </div>
      <div
        className="flex flex-col items-center gap-0.5 pl-2"
        style={{ color: "#9aa0a6" }}
      >
        <svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#1c3aa9" strokeWidth="3" />
          <path d="M24 8a16 16 0 0 1 14 8" fill="none" stroke="#4a90d9" strokeWidth="3" strokeLinecap="round" />
          <path d="M38 9v7h-7" fill="none" stroke="#4a90d9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 40a16 16 0 0 1-14-8" fill="none" stroke="#1c3aa9" strokeWidth="3" strokeLinecap="round" />
          <path d="M10 39v-7h7" fill="none" stroke="#1c3aa9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[9px] leading-none">reCAPTCHA</span>
        <span className="text-[8px] leading-none">{t("privacyTerms")}</span>
      </div>
    </div>
  );
}
