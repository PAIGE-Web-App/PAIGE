// Centralized date utility functions to eliminate duplication across components

/**
 * Parse a yyyy-MM-ddTHH:mm string as a local Date
 * Used across multiple components for consistent date parsing
 */
export function parseLocalDateTime(input: string): Date {
  if (typeof input !== 'string') return new Date(NaN);
  const [datePart, timePart] = input.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 17, minute = 0] = (timePart ? timePart.split(':').map(Number) : [17, 0]);
  // Always create a local date
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Format a Date as yyyy-MM-ddTHH:mm for input type="datetime-local"
 */
export function formatDateForInputWithTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format date string for display with fallback handling
 */
export function formatDateStringForDisplay(dateString?: string): string {
  if (!dateString || typeof dateString !== 'string') return '';
  const date = parseLocalDateTime(dateString);
  return isNaN(date.getTime()) ? '' : date.toLocaleString();
}

/**
 * Get relative date string (Today, Yesterday, or formatted date)
 */
export function getRelativeDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return "Today";
  } else if (isYesterday) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    });
  }
}

/**
 * Get relative deadline text with start/end date context
 */
export function getRelativeDeadline(deadline: Date, startDate?: Date, endDate?: Date): string {
  const now = new Date();
  const timeDiff = deadline.getTime() - now.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

  if (daysDiff < 0) {
    return "Overdue";
  } else if (daysDiff === 0) {
    return "Due today";
  } else if (daysDiff === 1) {
    return "Due tomorrow";
  } else if (daysDiff <= 7) {
    return `Due in ${daysDiff} days`;
  } else {
    return deadline.toLocaleDateString();
  }
}

/**
 * Convert null to undefined for Firestore fields
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}
