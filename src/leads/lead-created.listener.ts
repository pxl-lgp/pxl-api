import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AutomationLog,
  AutomationService,
  automationEventName,
} from '../automation/automation.service';

@Injectable()
export class LeadCreatedListener {
  constructor(private readonly automationService: AutomationService) {}

  @OnEvent(automationEventName('lead-created'))
  async handleLeadCreated(log: AutomationLog): Promise<void> {
    // No external side-effect today (the old n8n flow only acknowledged the
    // event). Record success so the log doesn't sit at PENDING forever.
    await this.automationService.recordResult(log.id, {
      status: 'SUCCEEDED',
      response: { handledAt: new Date().toISOString() },
    });
  }
}
