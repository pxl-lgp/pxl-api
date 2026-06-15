import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { AppConfig } from '../config/app.config';

const REMINDER_DURATION_MS = 30 * 60 * 1000;

export type PublishReminderInput = {
  contentId: string;
  clientId?: string | null;
  title?: string | null;
  platform?: string | null;
  contentType?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  scheduledAt: string | Date | null | undefined;
};

@Injectable()
export class CalendarService {
  private readonly calendar: calendar_v3.Calendar | null;
  private readonly calendarId: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    this.calendarId = config.get('GOOGLE_CALENDAR_ID', { infer: true }) || 'primary';

    const oauthClientId = config.get('GOOGLE_DRIVE_CLIENT_ID', { infer: true });
    const oauthClientSecret = config.get('GOOGLE_DRIVE_CLIENT_SECRET', { infer: true });
    const oauthRefreshToken = config.get('GOOGLE_DRIVE_REFRESH_TOKEN', { infer: true });
    const clientEmail = config.get('GOOGLE_DRIVE_CLIENT_EMAIL', { infer: true });
    const privateKey = config.get('GOOGLE_DRIVE_PRIVATE_KEY', { infer: true });

    if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
      const auth = new google.auth.OAuth2(oauthClientId, oauthClientSecret);
      auth.setCredentials({ refresh_token: oauthRefreshToken });
      this.calendar = google.calendar({ version: 'v3', auth });
      return;
    }

    if (!clientEmail || !privateKey) {
      this.calendar = null;
      return;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.events'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  /**
   * Whether Google Calendar credentials are configured. Lets background callers
   * skip silently instead of throwing when no calendar is wired up.
   */
  isEnabled(): boolean {
    return this.calendar !== null;
  }

  /**
   * Creates a 30-minute publishing-reminder event on the configured calendar.
   * Replaces the n8n content-scheduled flow.
   */
  async createPublishReminder(input: PublishReminderInput) {
    if (!input.scheduledAt) {
      throw new ServiceUnavailableException('Cannot create a reminder without a scheduled time.');
    }

    const start = new Date(input.scheduledAt);

    if (Number.isNaN(start.getTime())) {
      throw new ServiceUnavailableException('The scheduled time is not a valid date.');
    }

    const end = new Date(start.getTime() + REMINDER_DURATION_MS);
    const platform = input.platform ? ` on ${input.platform}` : '';
    const summary = `Publish: ${input.title ?? 'Scheduled content'}${platform}`;

    const response = await this.getCalendar().events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary,
        description: this.buildDescription(input),
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      },
    });

    return {
      eventId: response.data.id ?? null,
      htmlLink: response.data.htmlLink ?? null,
    };
  }

  private buildDescription(input: PublishReminderInput) {
    const lines = [
      'PXL publishing reminder.',
      '',
      `Content ID: ${input.contentId}`,
      `Client ID: ${input.clientId ?? 'n/a'}`,
      `Type: ${input.contentType ?? 'content'}`,
    ];

    if (input.caption) {
      lines.push('', 'Caption:', input.caption);
    }

    if (Array.isArray(input.hashtags) && input.hashtags.length > 0) {
      const hashtags = input.hashtags
        .map((tag) => `#${String(tag).replace(/^#/, '')}`)
        .join(' ');
      lines.push('', `Hashtags: ${hashtags}`);
    }

    return lines.join('\n');
  }

  private getCalendar() {
    if (!this.calendar) {
      throw new ServiceUnavailableException(
        'Google Calendar is not configured. Add OAuth or service-account credentials to the API environment.',
      );
    }

    return this.calendar;
  }
}
