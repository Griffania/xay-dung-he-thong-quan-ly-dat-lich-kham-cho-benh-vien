-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('ONLINE', 'WALK_IN');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "booking_type" "BookingType" NOT NULL DEFAULT 'ONLINE';
