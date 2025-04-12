"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type DateRangePickerProps = React.HTMLAttributes<HTMLDivElement> & {
  dateRange?: DateRange;
  onDateRangeChange?: (dateRange: DateRange | undefined) => void;
  placeholder?: string;
  align?: "center" | "start" | "end";
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "Select date range",
  align = "start",
  className,
  ...props
}: DateRangePickerProps) {
  // Use internal state if no external state is provided
  const [internalDateRange, setInternalDateRange] = React.useState<DateRange | undefined>(() => {
    // Default to current month if no date range provided
    if (!dateRange) {
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { from: startOfMonth, to: endOfMonth }
    }
    return dateRange
  })

  // Use the provided date range or the internal one
  const date = dateRange || internalDateRange

  // Handle date change
  const handleDateChange = (newDate: DateRange | undefined) => {
    if (!onDateRangeChange) {
      setInternalDateRange(newDate)
    } else {
      onDateRangeChange(newDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)} {...props}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
} 