-- CreateEnum
CREATE TYPE "TripRequestStatus" AS ENUM ('pending', 'canceled');

-- CreateTable
CREATE TABLE "trip_requests" (
  "id" TEXT NOT NULL,
  "requester_name" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "departure_at" TIMESTAMP(3) NOT NULL,
  "return_at" TIMESTAMP(3) NOT NULL,
  "purpose" TEXT NOT NULL,
  "passenger_count" INTEGER NOT NULL,
  "status" "TripRequestStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "trip_requests_pkey" PRIMARY KEY ("id")
);
