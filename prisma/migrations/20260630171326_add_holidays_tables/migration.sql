-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "weekday" TEXT NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday_sync_configs" (
    "year" INTEGER NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holiday_sync_configs_pkey" PRIMARY KEY ("year")
);

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_name_key" ON "holidays"("date", "name");
