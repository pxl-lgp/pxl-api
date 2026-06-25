import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.constants';
import { Database } from '../database/database.types';
import { organizationFeatureAccess, organizations } from '../database/schema';
import { featureDefinitions, FeatureKey } from './features';

@Injectable()
export class FeatureAccessService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async listForOrganization(organizationId: string) {
    await this.requireOrganization(organizationId);
    const overrides = await this.db
      .select()
      .from(organizationFeatureAccess)
      .where(eq(organizationFeatureAccess.organizationId, organizationId));

    return featureDefinitions.map((feature) => {
      const override = overrides.find((item) => item.featureKey === feature.key);

      return {
        ...feature,
        enabled: override ? override.enabled === 1 : true,
      };
    });
  }

  async isEnabled(organizationId: string, featureKey: FeatureKey): Promise<boolean> {
    const [override] = await this.db
      .select({ enabled: organizationFeatureAccess.enabled })
      .from(organizationFeatureAccess)
      .where(
        and(
          eq(organizationFeatureAccess.organizationId, organizationId),
          eq(organizationFeatureAccess.featureKey, featureKey),
        ),
      )
      .limit(1);

    return override ? override.enabled === 1 : true;
  }

  async setFeature(organizationId: string, featureKey: FeatureKey, enabled: boolean) {
    await this.requireOrganization(organizationId);

    const [record] = await this.db
      .insert(organizationFeatureAccess)
      .values({ organizationId, featureKey, enabled: enabled ? 1 : 0 })
      .onConflictDoUpdate({
        target: [organizationFeatureAccess.organizationId, organizationFeatureAccess.featureKey],
        set: { enabled: enabled ? 1 : 0, updatedAt: new Date() },
      })
      .returning();

    return record;
  }

  private async requireOrganization(organizationId: string): Promise<void> {
    const [organization] = await this.db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!organization) {
      throw new NotFoundException('Organization not found.');
    }
  }
}
