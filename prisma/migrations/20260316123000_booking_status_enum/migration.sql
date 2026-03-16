-- Create enum type for booking statuses
CREATE TYPE "BookingStatus" AS ENUM (
  'PENDING',
  'PAID',
  'CONFIRMED',
  'CANCELLED',
  'BLOCKED'
);

-- Convert Booking.status from text to enum
ALTER TABLE "Booking"
ALTER COLUMN "status" DROP DEFAULT,
ALTER COLUMN "status" TYPE "BookingStatus" USING ("status"::"BookingStatus"),
ALTER COLUMN "status" SET DEFAULT 'PENDING';
