import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AutomationLog,
  AutomationService,
  automationEventName,
} from '../automation/automation.service';
import { DriveService } from './drive.service';

@Injectable()
export class DriveProvisioningListener {
  private readonly logger = new Logger(DriveProvisioningListener.name);

  constructor(
    private readonly driveService: DriveService,
    private readonly automationService: AutomationService,
  ) {}

  @OnEvent(automationEventName('client-created'))
  async handleClientCreated(log: AutomationLog): Promise<void> {
    const payload = log.payload;
    const clientId = (payload.clientId as string | undefined) ?? log.entityId ?? '';
    const businessName = (payload.businessName as string | undefined) ?? '';

    if (!clientId) {
      await this.automationService.recordResult(log.id, {
        status: 'FAILED',
        errorMessage: 'client-created event is missing a client id.',
      });
      return;
    }

    try {
      const result = await this.driveService.provisionClientWorkspace(clientId, businessName);
      await this.automationService.recordResult(log.id, {
        status: 'SUCCEEDED',
        response: { ...result, completedAt: new Date().toISOString() },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Drive provisioning error.';
      this.logger.error(`Drive provisioning failed for client ${clientId}: ${message}`);
      await this.automationService.recordResult(log.id, {
        status: 'FAILED',
        errorMessage: message,
      });
    }
  }
}
