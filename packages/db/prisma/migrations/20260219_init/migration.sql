-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN_TECH', 'SUPERVISOR', 'AGENT_OPERATIVE');
CREATE TYPE "AgentStatus" AS ENUM ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR');
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING');
CREATE TYPE "MessageDirection" AS ENUM ('IN', 'OUT');
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'DOC', 'AUDIO');
CREATE TYPE "BackupType" AS ENUM ('FULL', 'INCREMENTAL');
CREATE TYPE "BackupStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');
CREATE TYPE "AIMessageRole" AS ENUM ('system', 'user', 'assistant', 'tool');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "mfa_recovery_codes" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "code" "RoleCode" NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" INTEGER NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role_id")
);

-- CreateTable
CREATE TABLE "whatsapp_agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(30) NOT NULL,
    "provider_phone_id" VARCHAR(100) NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "whatsapp_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_agent_access" (
    "user_id" UUID NOT NULL,
    "agent_id" UUID NOT NULL,
    CONSTRAINT "user_agent_access_pkey" PRIMARY KEY ("user_id", "agent_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "customer_wa_id" VARCHAR(100) NOT NULL,
    "customer_name" VARCHAR(255),
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "message_type" "MessageType" NOT NULL,
    "text_content" TEXT,
    "media_url" TEXT,
    "mime_type" VARCHAR(100),
    "provider_message_id" VARCHAR(150),
    "sent_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requested_by" UUID,
    "backup_type" "BackupType" NOT NULL,
    "status" "BackupStatus" NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "artifact_path" TEXT,
    "checksum" VARCHAR(128),
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "backup_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "resource_type" VARCHAR(60) NOT NULL,
    "resource_id" VARCHAR(120),
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "agent_scope_id" UUID,
    "model_provider" VARCHAR(40) NOT NULL,
    "model_name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ai_session_id" UUID NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");
CREATE UNIQUE INDEX "whatsapp_agents_code_key" ON "whatsapp_agents"("code");
CREATE INDEX "conversations_agent_id_status_idx" ON "conversations"("agent_id", "status");
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
CREATE INDEX "messages_provider_message_id_idx" ON "messages"("provider_message_id");
CREATE INDEX "backup_jobs_status_created_at_idx" ON "backup_jobs"("status", "created_at");
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");
CREATE INDEX "ai_sessions_user_id_created_at_idx" ON "ai_sessions"("user_id", "created_at");
CREATE INDEX "ai_sessions_agent_scope_id_idx" ON "ai_sessions"("agent_scope_id");
CREATE INDEX "ai_messages_ai_session_id_created_at_idx" ON "ai_messages"("ai_session_id", "created_at");

-- AddForeignKey
ALTER TABLE "user_roles"
ADD CONSTRAINT "user_roles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_roles"
ADD CONSTRAINT "user_roles_role_id_fkey"
FOREIGN KEY ("role_id") REFERENCES "roles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_agent_access"
ADD CONSTRAINT "user_agent_access_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_agent_access"
ADD CONSTRAINT "user_agent_access_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "whatsapp_agents"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations"
ADD CONSTRAINT "conversations_agent_id_fkey"
FOREIGN KEY ("agent_id") REFERENCES "whatsapp_agents"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "backup_jobs"
ADD CONSTRAINT "backup_jobs_requested_by_fkey"
FOREIGN KEY ("requested_by") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_sessions"
ADD CONSTRAINT "ai_sessions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_sessions"
ADD CONSTRAINT "ai_sessions_agent_scope_id_fkey"
FOREIGN KEY ("agent_scope_id") REFERENCES "whatsapp_agents"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_messages"
ADD CONSTRAINT "ai_messages_ai_session_id_fkey"
FOREIGN KEY ("ai_session_id") REFERENCES "ai_sessions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed base roles
INSERT INTO "roles" ("code") VALUES
('ADMIN_TECH'),
('SUPERVISOR'),
('AGENT_OPERATIVE')
ON CONFLICT ("code") DO NOTHING;
