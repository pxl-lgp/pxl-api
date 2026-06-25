import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AutomationRetryService } from '../automation/automation-retry.service';
import { AutomationService } from '../automation/automation.service';

@Injectable()
export class AutomationRetrySchedulerService {
  private readonly logger = new Logger(AutomationRetrySchedulerService.name);

  constructor(
    private readonly automationService: AutomationService,
    private readonly automationRetryService: AutomationRetryService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async retryFailedAutomations(): Promise<void> {
    const failedLogs = await this.automationService.findAll('FAILED');
    const retryable = failedLogs.filter((log) =>
      ['drive-folder-provisioned', 'content-calendar-reminder'].includes(log.eventName),
    );

    for (const log of retryable.slice(0, 5)) {
      try {
        await this.automationRetryService.retry(log.id);
      } catch (error) {
        this.logger.warn(
          `Scheduled retry failed for ${log.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
