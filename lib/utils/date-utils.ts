/*
<ai_context>
Contains the utility functions for date/time handling.
Ensures consistent timezone handling throughout the app.
</ai_context>
*/

import { format, formatDistanceToNow } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { enGB } from "date-fns/locale";

// Default timezone for the application
export const DEFAULT_TIMEZONE = "Europe/London";

/**
 * Convert a local date to UTC for storage
 */
export function toUTC(date: Date): Date {
  // Convert to UTC by using the ISO string method which gives us a UTC date
  return new Date(date.toISOString());
}

/**
 * Convert a UTC date to Europe/London timezone for display
 */
export function fromUTC(date: Date | string): Date {
  const utcDate = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(utcDate, DEFAULT_TIMEZONE);
}

/**
 * Format a UTC date for display in the application's timezone
 */
export function formatDate(
  date: Date | string, 
  formatString: string = "PPP",
  options: { useTimezone?: boolean } = { useTimezone: true }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const displayDate = options.useTimezone ? fromUTC(dateObj) : dateObj;
  
  return format(displayDate, formatString, { locale: enGB });
}

/**
 * Format a UTC date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(
  date: Date | string,
  options: { useTimezone?: boolean } = { useTimezone: true }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const displayDate = options.useTimezone ? fromUTC(dateObj) : dateObj;
  
  return formatDistanceToNow(displayDate, { addSuffix: true, locale: enGB });
}

/**
 * Create a new Date object ensuring it's in UTC
 * Use this when creating dates to store in the database
 */
export function createUTCDate(): Date {
  return toUTC(new Date());
}

/**
 * Convert an ISO string to a UTC Date
 */
export function isoToUTCDate(isoString: string): Date {
  return new Date(isoString);
}

export function getUTCMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function getUTCMonthEnd(date: Date): Date {
  // Go to the start of the next month, then subtract 1 millisecond
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 1);
}