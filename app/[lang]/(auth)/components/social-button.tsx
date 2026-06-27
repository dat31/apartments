import * as React from "react";

export function SocialButton({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-12 w-full bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center gap-3 font-medium text-[15px] whitespace-nowrap focus-ring active:scale-[.98] transition-colors"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
