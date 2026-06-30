import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { AuthModule } from './auth/auth.module';
import { AutomationModule } from './automation/automation.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AssetsModule } from './assets/assets.module';
import { AssistantModule } from './assistant/assistant.module';
import { AuditModule } from './audit/audit.module';
import { AutomationRetryModule } from './automation/automation-retry.module';
import { CalendarModule } from './calendar/calendar.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ClientsModule } from './clients/clients.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { ContentModule } from './content/content.module';
import { ContentPillarsModule } from './content-pillars/content-pillars.module';
import { ContentTemplatesModule } from './content-templates/content-templates.module';
import { validateConfig } from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { DriveModule } from './drive/drive.module';
import { FeatureAccessModule } from './feature-access/feature-access.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { OnboardingTasksModule } from './onboarding-tasks/onboarding-tasks.module';
import { OperationsModule } from './operations/operations.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SettingsModule } from './settings/settings.module';
import { SocialConnectionsModule } from './social-connections/social-connections.module';
import { UsersModule } from './users/users.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.production', '.env.local', '.env'],
      validate: validateConfig,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AiModule,
    AnalyticsModule,
    AssetsModule,
    AssistantModule,
    AuditModule,
    AutomationModule,
    AutomationRetryModule,
    ApprovalsModule,
    CalendarModule,
    CampaignsModule,
    ClientsModule,
    ClientPortalModule,
    ContentModule,
    ContentPillarsModule,
    ContentTemplatesModule,
    DriveModule,
    FeatureAccessModule,
    LeadsModule,
    OnboardingModule,
    OnboardingTasksModule,
    OperationsModule,
    OrganizationsModule,
    PermissionsModule,
    ReportsModule,
    SchedulerModule,
    SettingsModule,
    SocialConnectionsModule,
    NotificationsModule,
    HealthModule,
    WorkspaceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
})
export class AppModule {}
