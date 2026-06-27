"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export const FILLED_INPUT =
  "h-11 bg-input border-transparent px-3.5 text-[15px] focus-ring";

type Props = React.ComponentProps<typeof Input> & {
  label?: string;
  rightLink?: React.ReactNode;
};

export const PasswordField = React.forwardRef<HTMLInputElement, Props>(
  function PasswordField({ label = "Password", rightLink, ...props }, ref) {
    const [show, setShow] = React.useState(false);
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {rightLink}
        </div>
        <div className="relative">
          <Input
            ref={ref}
            type={show ? "text" : "password"}
            placeholder="••••••••"
            className={`${FILLED_INPUT} pr-11`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-0 top-0 h-11 w-11 inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus-ring"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
    );
  }
);
