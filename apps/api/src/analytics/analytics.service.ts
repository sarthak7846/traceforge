import { Injectable } from '@nestjs/common';
import { prisma } from '@observe/db';
import { MembershipService } from 'src/membership/membership.service';

type VolumeRange = '24h' | '7d' | '30d';

@Injectable()
export class AnalyticsService {
  constructor(private readonly membershipService: MembershipService) {}

  async getOverview(projectId: string, userId: string) {
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
    });

    await this.membershipService.getMembershipById(
      userId,
      project.organizationId,
    );

    const aggregation = await prisma.trace.aggregate({
      where: {
        projectId,
      },
      _count: {
        _all: true,
      },
      _avg: {
        latencyMs: true,
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
    });

    // Success / error counts
    const statusCounts = await prisma.trace.groupBy({
      by: ['status'],
      where: {
        projectId,
      },
      _count: {
        _all: true,
      },
    });

    const totalTraces = aggregation._count._all;

    const successfulTraces =
      statusCounts.find((item) => item.status === 'SUCCESS')?._count._all ?? 0;

    const errorTraces =
      statusCounts.find((item) => item.status === 'ERROR')?._count._all ?? 0;

    const errorRate = totalTraces > 0 ? (errorTraces / totalTraces) * 100 : 0;

    // Latency percentiles
    const percentileResult = await prisma.$queryRaw<
      {
        p50: number | null;
        p95: number | null;
        p99: number | null;
      }[]
    >`
    SELECT
      PERCENTILE_CONT(0.50)
        WITHIN GROUP (ORDER BY "latencyMs") AS p50,

      PERCENTILE_CONT(0.95)
        WITHIN GROUP (ORDER BY "latencyMs") AS p95,

      PERCENTILE_CONT(0.99)
        WITHIN GROUP (ORDER BY "latencyMs") AS p99

    FROM "Trace"
    WHERE "projectId" = ${projectId}
      AND "latencyMs" IS NOT NULL
  `;

    const percentiles = percentileResult[0];

    return {
      totalTraces,

      successfulTraces,
      errorTraces,
      errorRate: Number(errorRate.toFixed(2)),

      averageLatencyMs: aggregation._avg.latencyMs ?? 0,

      p50LatencyMs: percentiles?.p50 ?? 0,
      p95LatencyMs: percentiles?.p95 ?? 0,
      p99LatencyMs: percentiles?.p99 ?? 0,

      totalTokens: aggregation._sum.totalTokens ?? 0,

      totalCost: aggregation._sum.totalCost?.toNumber() ?? 0,
    };
  }

  async getVolume(
    projectId: string,
    userId: string,
    range: VolumeRange = '24h',
  ) {
    // 1. Verify project exists
    const project = await prisma.project.findUniqueOrThrow({
      where: {
        id: projectId,
      },
    });

    // 2. Verify membership
    await this.membershipService.getMembershipById(
      userId,
      project.organizationId,
    );

    const now = new Date();

    let startDate: Date;
    let truncUnit: 'hour' | 'day';

    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        truncUnit = 'day';
        break;

      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        truncUnit = 'day';
        break;

      case '24h':
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        truncUnit = 'hour';
        break;
    }
    //Date truncate - Ignore minutes and seconds and put every trace into its hour.
    const result =
      truncUnit === 'hour'
        ? await prisma.$queryRaw<
            {
              timestamp: Date;
              total: bigint;
              success: bigint;
              errors: bigint;
            }[]
          >`
          SELECT
            DATE_TRUNC('hour', "createdAt") AS timestamp,

            COUNT(*) AS total,

            COUNT(*) FILTER (
              WHERE "status" = 'SUCCESS'
            ) AS success,

            COUNT(*) FILTER (
              WHERE "status" = 'ERROR'
            ) AS errors

          FROM "Trace"

          WHERE
            "projectId" = ${projectId}
            AND "createdAt" >= ${startDate}
            AND "createdAt" <= ${now}

          GROUP BY DATE_TRUNC('hour', "createdAt")

          ORDER BY DATE_TRUNC('hour', "createdAt") ASC
        `
        : await prisma.$queryRaw<
            {
              timestamp: Date;
              total: bigint;
              success: bigint;
              errors: bigint;
            }[]
          >`
          SELECT
            DATE_TRUNC('day', "createdAt") AS timestamp,

            COUNT(*) AS total,

            COUNT(*) FILTER (
              WHERE "status" = 'SUCCESS'
            ) AS success,

            COUNT(*) FILTER (
              WHERE "status" = 'ERROR'
            ) AS errors

          FROM "Trace"

          WHERE
            "projectId" = ${projectId}
            AND "createdAt" >= ${startDate}
            AND "createdAt" <= ${now}

          GROUP BY DATE_TRUNC('day', "createdAt")

          ORDER BY DATE_TRUNC('day', "createdAt") ASC
        `;

    return {
      range,
      interval: truncUnit,
      data: result.map((row) => ({
        timestamp: row.timestamp,
        total: Number(row.total),
        success: Number(row.success),
        errors: Number(row.errors),
      })),
    };
  }
}
