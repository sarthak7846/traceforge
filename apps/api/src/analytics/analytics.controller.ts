import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { User } from 'src/auth/user.decorator';
import { UserPayload } from 'src/common/interfaces/user-payload.interface';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(
    @Query('projectId') projectId: string,
    @User() user: UserPayload,
  ) {
    return this.analyticsService.getOverview(projectId, user.sub);
  }

  @Get('volume')
  async getVolume(
    @Query('projectId') projectId: string,
    @Query('range') range: '24h' | '7d' | '30d' = '24h',
    @User() user: UserPayload,
  ) {
    return this.analyticsService.getVolume(projectId, user.sub, range);
  }
}
