"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // The off track is a neutral grey rather than `bg-input`: this theme's
        // input surface is only a shade off the page in either mode, which
        // left an unchecked switch reading as an empty box. Grey at 30% keeps
        // the thumb legible against it in both themes.
        "peer inline-flex h-5 w-9 shrink-0 items-center border border-transparent p-px transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:bg-primary data-unchecked:bg-muted-foreground/30",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // `bg-background` in both states: white on the light theme's dark green
        // and near-black on the dark theme's light green, so the thumb is the
        // high-contrast element either way round.
        className="pointer-events-none block size-4 bg-background transition-transform data-checked:translate-x-4 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
