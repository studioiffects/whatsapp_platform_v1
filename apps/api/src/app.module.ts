import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AIModule } from "./ai/ai.module";
import { ArchiveModule } from "./archive/archive.module";
import { AuthModule } from "./auth/auth.module";
import { AuthzModule } from "./auth/authz.module";
import { BackupsModule } from "./backups/backups.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { McpModule } from "./mcp/mcp.module";
import { MessagesModule } from "./messages/messages.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReportsModule } from "./reports/reports.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { SkillsModule } from "./skills/skills.module";
import { StoreModule } from "./store/store.module";
import { WAAgentsModule } from "./wa-agents/wa-agents.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.local", ".env.example"],
    }),
    ScheduleModule.forRoot(),
    ArchiveModule,
    PrismaModule,
    StoreModule,
    RealtimeModule,
    AuthModule,
    AuthzModule,
    WAAgentsModule,
    ConversationsModule,
    MessagesModule,
    DashboardModule,
    ReportsModule,
    BackupsModule,
    AIModule,
    McpModule,
    SkillsModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule {}
