import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AutomationModule } from './automation/automation.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AiModule } from './ai/ai.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AssetsModule } from './assets/assets.module';
import { ClientsModule } from './clients/clients.module';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { ContentModule } from './content/content.module';
import { validateConfig } from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { DriveModule } from './drive/drive.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ReportsModule } from './reports/reports.module';
import { SocialConnectionsModule } from './social-connections/social-connections.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfig,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    AiModule,
    AnalyticsModule,
    AssetsModule,
    AutomationModule,
    ApprovalsModule,
    ClientsModule,
    ClientPortalModule,
    ContentModule,
    DriveModule,
    LeadsModule,
    OnboardingModule,
    ReportsModule,
    SocialConnectionsModule,
    HealthModule,
  ],
})
export class AppModule {}
