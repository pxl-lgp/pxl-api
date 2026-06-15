import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AutomationLog,
  AutomationService,
  automationEventName,
} from '../automation/automation.service';
import { CalendarService } from './calendar.service';

@Injectable()
export class ContentCalendarListener {
  private readonly logger = new Logger(ContentCalendarListener.name);

  constructor(
    private readonly calendarService: CalendarService,
    private readonly automationService: AutomationService,
  ) {}

  @OnEvent(automationEventName('content-scheduled'))
  async handleContentScheduled(log: AutomationLog): Promise<void> {
    const payload = log.payload;

    try {
      const result = await this.calendarService.createPublishReminder({
        contentId: (payload.id as string | undefined) ?? log.entityId ?? '',
        clientId: payload.clientId as string | undefined,
        title: payload.title as string | undefined,
        platform: payload.platform as string | undefined,
        contentType: payload.contentType as string | undefined,
        caption: payload.caption as string | undefined,
        hashtags: payload.hashtags as string[] | undefined,
        scheduledAt: payload.scheduledAt as string | undefined,
      });
      await this.automationService.recordResult(log.id, {
        status: 'SUCCEEDED',
        response: { ...result, completedAt: new Date().toISOString() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown calendar reminder error.';
      this.logger.error(`Calendar reminder failed for content ${log.entityId}: ${message}`);
      await this.automationService.recordResult(log.id, {
        status: 'FAILED',
        errorMessage: message,
      });
    }
  }
}
