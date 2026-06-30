import type { PrismaClient } from '@prisma/client'

import type { HolidayRepository } from './holidays-repository.js'
import type { HolidayRecord } from '../providers/holidays-provider.js'

export class PrismaHolidayRepository implements HolidayRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findByYear(year: number): Promise<HolidayRecord[]> {
    return this.prisma.holiday.findMany({
      where: { year },
      select: {
        date: true,
        name: true,
        type: true,
        weekday: true,
        year: true,
      },
    })
  }

  public async saveMany(holidays: HolidayRecord[], year: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.holiday.deleteMany({ where: { year } }),
      this.prisma.holiday.createMany({
        data: holidays.map((holiday) => ({
          date: holiday.date,
          name: holiday.name,
          type: holiday.type,
          weekday: holiday.weekday,
          year: year,
        })),
      }),
    ])
  }

  public async getLastSyncDate(year: number): Promise<Date | null> {
    const config = await this.prisma.holidaySyncConfig.findUnique({
      where: { year },
    })
    return config ? config.lastSyncedAt : null
  }

  public async updateSyncDate(year: number, date: Date): Promise<void> {
    await this.prisma.holidaySyncConfig.upsert({
      where: { year },
      update: { lastSyncedAt: date },
      create: { year, lastSyncedAt: date },
    })
  }
}
