import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppConfig } from '../config/app.config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly teamEmail: string | undefined;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const host = config.get('SMTP_HOST', { infer: true });
    const user = config.get('SMTP_USER', { infer: true });
    const pass = config.get('SMTP_PASS', { infer: true });

    this.from = config.get('SMTP_FROM', { infer: true }) ?? `PXL <${user ?? 'noreply@pxl.local'}>`;
    this.teamEmail = config.get('TEAM_NOTIFICATION_EMAIL', { infer: true });

    if (!host) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: config.get('SMTP_PORT', { infer: true }),
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async notifyTeamOfNewLead(lead: {
    businessName: string;
    contactPerson?: string | null;
    email: string;
    phone?: string | null;
    source?: string | null;
    message?: string | null;
  }): Promise<void> {
    if (!this.transporter || !this.teamEmail) {
      return;
    }

    const lines = [
      `Business: ${lead.businessName}`,
      lead.contactPerson ? `Contact: ${lead.contactPerson}` : null,
      `Email: ${lead.email}`,
      lead.phone ? `Phone: ${lead.phone}` : null,
      lead.source ? `Source: ${lead.source}` : null,
      lead.message ? `\nMessage:\n${lead.message}` : null,
    ].filter(Boolean);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: this.teamEmail,
        subject: `New lead: ${lead.businessName}`,
        text: lines.join('\n'),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send lead notification email: ${message}`);
    }
  }

  async notifyTeamOfNewOnboarding(client: {
    businessName: string;
    contactPerson?: string | null;
    email?: string | null;
  }): Promise<void> {
    if (!this.transporter || !this.teamEmail) {
      return;
    }

    const lines = [
      `Business: ${client.businessName}`,
      client.contactPerson ? `Contact: ${client.contactPerson}` : null,
      client.email ? `Email: ${client.email}` : null,
    ].filter(Boolean);

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: this.teamEmail,
        subject: `New onboarding: ${client.businessName}`,
        text: lines.join('\n'),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send onboarding notification email: ${message}`);
    }
  }
}
