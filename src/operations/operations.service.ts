import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import {
  analytics,
  assets,
  automationLogs,
  clients,
  contentItems,
  leads,
  reports,
  socialConnections,
} from '../database/schema';

@Injectable()
export class OperationsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async exportCsv(
    entity: 'clients' | 'leads' | 'content' | 'analytics' | 'audit' | 'billing',
    organizationId: string,
  ): Promise<string> {
    if (entity === 'clients' || entity === 'billing') {
      return toCsv(
        await this.db
          .select()
          .from(clients)
          .where(eq(clients.organizationId, organizationId))
          .orderBy(desc(clients.createdAt)),
      );
    }
    if (entity === 'leads') {
      return toCsv(
        await this.db
          .select()
          .from(leads)
          .where(eq(leads.organizationId, organizationId))
          .orderBy(desc(leads.createdAt)),
      );
    }
    if (entity === 'content') {
      const rows = await this.db
        .select({ item: contentItems })
        .from(contentItems)
        .innerJoin(clients, eq(contentItems.clientId, clients.id))
        .where(eq(clients.organizationId, organizationId))
        .orderBy(desc(contentItems.createdAt));
      return toCsv(rows.map((row) => row.item));
    }
    if (entity === 'analytics') {
      const rows = await this.db
        .select({ record: analytics })
        .from(analytics)
        .innerJoin(contentItems, eq(analytics.contentItemId, contentItems.id))
        .innerJoin(clients, eq(contentItems.clientId, clients.id))
        .where(eq(clients.organizationId, organizationId))
        .orderBy(desc(analytics.createdAt));
      return toCsv(rows.map((row) => row.record));
    }

    return toCsv(
      await this.db.select().from(automationLogs).orderBy(desc(automationLogs.createdAt)),
    );
  }

  async importClients(rows: Array<Record<string, string>>, organizationId: string) {
    const inserted = [];

    for (const row of rows) {
      const [client] = await this.db
        .insert(clients)
        .values({
          organizationId,
          businessName: row.businessName,
          industry: row.industry || undefined,
          contactPerson: row.contactPerson || undefined,
          email: row.email?.toLowerCase() || undefined,
          phone: row.phone || undefined,
          goals: row.goals || undefined,
          brandNotes: row.brandNotes || undefined,
          servicesNeeded: row.servicesNeeded
            ? row.servicesNeeded
                .split(';')
                .map((value) => value.trim())
                .filter(Boolean)
            : [],
        })
        .returning();
      inserted.push(client);
    }

    return { imported: inserted.length, records: inserted };
  }

  async importLeads(rows: Array<Record<string, string>>, organizationId: string) {
    const inserted = [];

    for (const row of rows) {
      const [lead] = await this.db
        .insert(leads)
        .values({
          organizationId,
          businessName: row.businessName,
          contactPerson: row.contactPerson || undefined,
          email: row.email.toLowerCase(),
          phone: row.phone || undefined,
          source: row.source || 'CSV import',
          message: row.message || undefined,
        })
        .returning();
      inserted.push(lead);
    }

    return { imported: inserted.length, records: inserted };
  }

  async getClientHealth(organizationId: string) {
    const clientRows = await this.db
      .select()
      .from(clients)
      .where(eq(clients.organizationId, organizationId))
      .orderBy(desc(clients.createdAt));
    const contentRows = await this.db.select().from(contentItems);
    const assetRows = await this.db.select().from(assets);
    const reportRows = await this.db.select().from(reports);
    const connectionRows = await this.db.select().from(socialConnections);
    const failedLogs = await this.db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.status, 'FAILED'));

    return clientRows.map((client) => {
      const reasons: string[] = [];
      const clientContent = contentRows.filter((item) => item.clientId === client.id);
      const clientAssets = assetRows.filter((asset) => asset.clientId === client.id);
      const clientReports = reportRows.filter((report) => report.clientId === client.id);
      const clientConnections = connectionRows.filter(
        (connection) => connection.clientId === client.id,
      );
      const failedAutomation = failedLogs.some((log) => log.entityId === client.id);

      if (clientContent.some((item) => item.status === 'REVISION_REQUESTED'))
        reasons.push('Revision requested');
      if (clientAssets.length === 0) reasons.push('No assets');
      if (clientConnections.length === 0) reasons.push('No social connections');
      if (failedAutomation) reasons.push('Failed automation');
      if (clientReports.length === 0) reasons.push('No reports');

      return {
        clientId: client.id,
        businessName: client.businessName,
        score: Math.max(0, 100 - reasons.length * 20),
        status: reasons.length >= 3 ? 'AT_RISK' : reasons.length >= 1 ? 'WATCH' : 'HEALTHY',
        reasons,
      };
    });
  }

  async search(q: string, organizationId: string) {
    const term = `%${q.trim()}%`;

    if (!q.trim()) {
      return [];
    }

    const [clientRows, leadRows, contentRows, assetRows, reportRows] = await Promise.all([
      this.db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.organizationId, organizationId),
            or(ilike(clients.businessName, term), ilike(clients.email, term)),
          ),
        )
        .limit(10),
      this.db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.organizationId, organizationId),
            or(ilike(leads.businessName, term), ilike(leads.email, term)),
          ),
        )
        .limit(10),
      this.db
        .select({ item: contentItems })
        .from(contentItems)
        .innerJoin(clients, eq(contentItems.clientId, clients.id))
        .where(
          and(
            eq(clients.organizationId, organizationId),
            or(ilike(contentItems.title, term), ilike(contentItems.caption, term)),
          ),
        )
        .limit(10),
      this.db
        .select({ item: assets })
        .from(assets)
        .innerJoin(clients, eq(assets.clientId, clients.id))
        .where(and(eq(clients.organizationId, organizationId), ilike(assets.name, term)))
        .limit(10),
      this.db
        .select({ item: reports })
        .from(reports)
        .innerJoin(clients, eq(reports.clientId, clients.id))
        .where(and(eq(clients.organizationId, organizationId), ilike(reports.title, term)))
        .limit(10),
    ]);

    return [
      ...clientRows.map((item) => ({
        type: 'client',
        id: item.id,
        title: item.businessName,
        href: `/admin/clients/${item.id}`,
      })),
      ...leadRows.map((item) => ({
        type: 'lead',
        id: item.id,
        title: item.businessName,
        href: '/admin/leads',
      })),
      ...contentRows.map((row) => ({
        type: 'content',
        id: row.item.id,
        title: row.item.title,
        href: `/admin/content/${row.item.id}`,
      })),
      ...assetRows.map((row) => ({
        type: 'asset',
        id: row.item.id,
        title: row.item.name,
        href: '/admin/assets',
      })),
      ...reportRows.map((row) => ({
        type: 'report',
        id: row.item.id,
        title: row.item.title,
        href: '/admin/reports',
      })),
    ];
  }
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')),
  ].join('\n');
}
