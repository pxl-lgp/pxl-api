import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppConfig } from '../config/app.config';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly teamEmail: string | undefined;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly settingsService: SettingsService,
  ) {
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

  /**
   * Best-effort generic team email. Used by reminder sweeps and any other
   * internal notification that just needs a subject + body. Never throws.
   */
  async notifyTeam(subject: string, body: string): Promise<void> {
    const recipients = await this.settingsService.getRecipients('new-lead', this.teamEmail);

    if (!this.transporter || recipients.length === 0) {
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: recipients,
        subject,
        text: body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send team notification "${subject}": ${message}`);
    }
  }

  async notifyTeamOfNewLead(lead: {
    businessName: string;
    contactPerson?: string | null;
    email: string;
    phone?: string | null;
    source?: string | null;
    message?: string | null;
  }): Promise<void> {
    const configuredRecipients = await this.settingsService.getRecipients('new-lead', this.teamEmail);
    const recipients = Array.from(
      new Set([...configuredRecipients, ...(this.teamEmail ? [this.teamEmail] : [])]),
    );

    if (!this.transporter || recipients.length === 0) {
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
        to: recipients,
        subject: `New lead: ${lead.businessName}`,
        text: lines.join('\n'),
        html: this.buildLeadNotificationHtml(lead),
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

  async notifyUser(to: string, subject: string, body: string): Promise<void> {
    if (!this.transporter) {
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        text: body,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send user notification "${subject}": ${message}`);
    }
  }

  private buildLeadNotificationHtml(lead: {
    businessName: string;
    contactPerson?: string | null;
    email: string;
    phone?: string | null;
    source?: string | null;
    message?: string | null;
  }): string {
    const details = [
      ['Business', lead.businessName],
      ['Contact', lead.contactPerson ?? ''],
      ['Email', lead.email],
      ['Phone', lead.phone ?? ''],
      ['Source', lead.source ?? ''],
    ].filter(([, value]) => value) as Array<[string, string]>;
    const escapedEmail = this.escapeHtml(lead.email);
    const messageHtml = lead.message
      ? this.formatLeadMessageHtml(lead.message)
      : 'No message provided.';

    return `<!doctype html>
<html>
  <body style="margin:0;background:#f3f7fb;padding:32px 16px;font-family:Inter,Arial,sans-serif;color:#172033;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;border-collapse:collapse;overflow:hidden;border-radius:24px;background:#ffffff;border:1px solid #dbe7f3;box-shadow:0 18px 55px rgba(15,23,42,.10);">
            <tr>
              <td style="padding:0;background:linear-gradient(135deg,#effcff,#f6f7ff 55%,#ffffff);border-bottom:1px solid #dbe7f3;">
                <div style="padding:32px 34px 28px;">
                  <div style="display:inline-block;margin-bottom:16px;border-radius:999px;border:1px solid #b7effb;background:#eafdff;padding:8px 13px;color:#087895;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">PXL Lead Alert</div>
                  <h1 style="margin:0;color:#111827;font-size:30px;line-height:1.15;font-weight:900;letter-spacing:-.035em;">New growth plan request</h1>
                  <p style="margin:10px 0 0;color:#526173;font-size:16px;line-height:1.6;">A prospect completed the free growth plan funnel. Review their details and follow up with a tailored recommendation.</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 34px 34px;">
                <div style="height:24px;line-height:24px;">&nbsp;</div>
                <div style="border-radius:18px;background:#ffffff;border:1px solid #dbe7f3;padding:22px;box-shadow:0 8px 24px rgba(15,23,42,.05);">
                  <h2 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:900;letter-spacing:-.02em;">${this.escapeHtml(lead.businessName)}</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    ${details
                      .map(
                        ([label, value]) => `<tr>
                          <td style="width:120px;padding:9px 0;color:#68778b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #eef3f8;">${this.escapeHtml(label)}</td>
                          <td style="padding:9px 0;color:#172033;font-size:15px;line-height:1.5;border-top:1px solid #eef3f8;">${
                            label === 'Email'
                              ? `<a href="mailto:${escapedEmail}" style="color:#087895;text-decoration:none;font-weight:800;">${escapedEmail}</a>`
                              : this.escapeHtml(String(value))
                          }</td>
                        </tr>`,
                      )
                      .join('')}
                  </table>
                </div>
                <div style="margin-top:18px;border-radius:18px;background:#f8fbfe;border:1px solid #dbe7f3;padding:22px;">
                  <div style="margin-bottom:12px;color:#087895;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;">Funnel Answers</div>
                  <div style="color:#253044;font-size:15px;line-height:1.72;">${messageHtml}</div>
                </div>
                <div style="margin-top:18px;border-radius:16px;background:#eefcff;border:1px solid #b7effb;padding:18px;color:#253044;font-size:14px;line-height:1.6;">
                  <div style="border-left:4px solid #5ddafc;padding-left:14px;">
                    <strong style="color:#111827;">Next step:</strong> Reply to <a href="mailto:${escapedEmail}" style="color:#087895;text-decoration:none;font-weight:800;">${escapedEmail}</a> with the custom growth plan or book a discovery call.
                  </div>
                </div>
                <p style="margin:22px 0 0;color:#7b8798;font-size:12px;line-height:1.5;text-align:center;">Sent automatically by the PXL Digital Marketing funnel.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private formatLeadMessageHtml(message: string): string {
    return message
      .split('\n')
      .map((line) => {
        if (!line.trim()) {
          return '<br>';
        }

        const separatorIndex = line.indexOf(':');

        if (separatorIndex === -1) {
          return this.escapeHtml(line);
        }

        const label = line.slice(0, separatorIndex + 1);
        const value = line.slice(separatorIndex + 1);

        return `<strong style="color:#111827;font-weight:800;">${this.escapeHtml(label)}</strong>${this.escapeHtml(value)}`;
      })
      .join('<br>');
  }
}
