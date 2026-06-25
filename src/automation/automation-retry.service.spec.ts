import { BadRequestException } from '@nestjs/common';
import { AutomationRetryService } from './automation-retry.service';
import { AutomationService } from './automation.service';
import { ClientsService } from '../clients/clients.service';
import { ContentService } from '../content/content.service';

describe('AutomationRetryService.retry', () => {
  const build = (log: Record<string, unknown>) => {
    const automationService = {
      findOne: jest.fn().mockResolvedValue(log),
    } as unknown as AutomationService;
    const retryDriveProvisioning = jest.fn().mockResolvedValue(undefined);
    const retryCalendarReminder = jest.fn().mockResolvedValue(undefined);
    const clientsService = { retryDriveProvisioning } as unknown as ClientsService;
    const contentService = { retryCalendarReminder } as unknown as ContentService;

    return {
      service: new AutomationRetryService(automationService, clientsService, contentService),
      retryDriveProvisioning,
      retryCalendarReminder,
    };
  };

  it('rejects a log that is not FAILED', async () => {
    const { service } = build({
      status: 'SUCCEEDED',
      eventName: 'drive-folder-provisioned',
      entityId: 'c1',
    });

    await expect(service.retry('log-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a failed log with no entity id', async () => {
    const { service } = build({
      status: 'FAILED',
      eventName: 'drive-folder-provisioned',
      entityId: null,
    });

    await expect(service.retry('log-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('re-runs drive provisioning for a failed drive-folder-provisioned log', async () => {
    const { service, retryDriveProvisioning } = build({
      status: 'FAILED',
      eventName: 'drive-folder-provisioned',
      entityId: 'client-1',
    });

    const result = await service.retry('log-1');

    expect(retryDriveProvisioning).toHaveBeenCalledWith('client-1');
    expect(result).toEqual({
      retried: true,
      eventName: 'drive-folder-provisioned',
      entityId: 'client-1',
    });
  });

  it('re-runs the calendar reminder for a failed content-calendar-reminder log', async () => {
    const { service, retryCalendarReminder } = build({
      status: 'FAILED',
      eventName: 'content-calendar-reminder',
      entityId: 'content-1',
    });

    await service.retry('log-1');

    expect(retryCalendarReminder).toHaveBeenCalledWith('content-1');
  });

  it('rejects an event type that cannot be retried', async () => {
    const { service } = build({ status: 'FAILED', eventName: 'lead-created', entityId: 'lead-1' });

    await expect(service.retry('log-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
