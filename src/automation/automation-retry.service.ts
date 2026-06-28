import { BadRequestException, Injectable } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { ContentService } from '../content/content.service';
import { AutomationService } from './automation.service';

export type RetryResult = {
  retried: boolean;
  eventName: string;
  entityId: string | null;
};

@Injectable()
export class AutomationRetryService {
  constructor(
    private readonly automationService: AutomationService,
    private readonly clientsService: ClientsService,
    private readonly contentService: ContentService,
  ) {}

  /**
   * Re-runs the side effect behind a FAILED automation log (Workflow Study /
   * review follow-up — n8n previously gave retries for free). Only the
   * background, idempotent automations are retryable.
   */
  async retry(logId: string): Promise<RetryResult> {
    const log = await this.automationService.findOne(logId);

    if (log.status !== 'FAILED') {
      throw new BadRequestException('Only failed automations can be retried.');
    }

    if (!log.entityId) {
      throw new BadRequestException('This automation log has no entity to retry against.');
    }

    switch (log.eventName) {
      case 'drive-folder-provisioned':
        await this.clientsService.retryDriveProvisioning(log.entityId);
        break;
      case 'content-calendar-reminder':
        await this.contentService.retryCalendarReminder(log.entityId);
        break;
      default:
        throw new BadRequestException(
          `Automation "${log.eventName}" cannot be retried automatically.`,
        );
    }

    await this.automationService.markSucceeded(log.id, { retriedAt: new Date().toISOString() });

    return { retried: true, eventName: log.eventName, entityId: log.entityId };
  }
}
