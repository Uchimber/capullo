export const BOOKING_STATUSES = [
  "PENDING",
  "PAID",
  "CONFIRMED",
  "CANCELLED",
  "BLOCKED",
] as const;

export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export function isBookingStatus(value: string): value is BookingStatusValue {
  return BOOKING_STATUSES.includes(value as BookingStatusValue);
}
