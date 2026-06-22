"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  /** Selected date as an ISO `yyyy-MM-dd` string. */
  value?: string
  /** Called with the new ISO `yyyy-MM-dd` string, or `undefined` when cleared. */
  onChange?: (value: string | undefined) => void
  /** Earliest selectable date, as an ISO `yyyy-MM-dd` string. */
  min?: string
  /** Latest selectable date, as an ISO `yyyy-MM-dd` string. */
  max?: string
  placeholder?: string
  disabled?: boolean
  /** Forwarded to the trigger for accessibility/validation styling. */
  id?: string
  "aria-invalid"?: boolean
  className?: string
}

/** Parse an ISO `yyyy-MM-dd` string into a local Date, ignoring bad input. */
function parse(value?: string): Date | undefined {
  if (!value) return undefined
  const d = parseISO(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Pick a date",
  disabled,
  id,
  className,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = parse(value)
  const minDate = parse(min)
  const maxDate = parse(max)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          data-empty={!date}
          className={cn(
            "w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
            className
          )}
        >
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
          <ChevronDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange?.(d ? format(d, "yyyy-MM-dd") : undefined)
            setOpen(false)
          }}
          defaultMonth={date}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
        />
      </PopoverContent>
    </Popover>
  )
}
