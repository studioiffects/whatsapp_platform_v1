-- Seed idempotente para ambiente local/staging.
-- Requiere que la migracion inicial ya se haya aplicado.

-- Roles base (defensivo)
INSERT INTO "roles" ("code") VALUES
('ADMIN_TECH'),
('SUPERVISOR'),
('AGENT_OPERATIVE')
ON CONFLICT ("code") DO NOTHING;

-- Usuarios base (password_hash placeholder)
INSERT INTO "users" ("id", "email", "password_hash", "full_name", "is_active", "mfa_enabled", "created_at", "updated_at")
VALUES
('00000000-0000-0000-0000-000000000001', 'admin@platform.local', '$2b$12$replace_with_bcrypt_hash', 'Admin Tecnico', true, true, now(), now()),
('00000000-0000-0000-0000-000000000002', 'supervisor@platform.local', '$2b$12$replace_with_bcrypt_hash', 'Supervisor General', true, true, now(), now()),
('00000000-0000-0000-0000-000000000003', 'agente01@platform.local', '$2b$12$replace_with_bcrypt_hash', 'Agente Operativo 01', true, false, now(), now())
ON CONFLICT ("email") DO NOTHING;

-- Asignacion de roles
INSERT INTO "user_roles" ("user_id", "role_id")
SELECT '00000000-0000-0000-0000-000000000001', r.id FROM "roles" r WHERE r.code = 'ADMIN_TECH'
ON CONFLICT ("user_id","role_id") DO NOTHING;

INSERT INTO "user_roles" ("user_id", "role_id")
SELECT '00000000-0000-0000-0000-000000000002', r.id FROM "roles" r WHERE r.code = 'SUPERVISOR'
ON CONFLICT ("user_id","role_id") DO NOTHING;

INSERT INTO "user_roles" ("user_id", "role_id")
SELECT '00000000-0000-0000-0000-000000000003', r.id FROM "roles" r WHERE r.code = 'AGENT_OPERATIVE'
ON CONFLICT ("user_id","role_id") DO NOTHING;

-- 10 agentes WhatsApp
INSERT INTO "whatsapp_agents"
("id","code","display_name","phone_number","provider_phone_id","status","created_at","updated_at")
VALUES
('10000000-0000-0000-0000-000000000001','agent-01','Agente 01','+51999000001','provider-phone-01','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000002','agent-02','Agente 02','+51999000002','provider-phone-02','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000003','agent-03','Agente 03','+51999000003','provider-phone-03','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000004','agent-04','Agente 04','+51999000004','provider-phone-04','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000005','agent-05','Agente 05','+51999000005','provider-phone-05','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000006','agent-06','Agente 06','+51999000006','provider-phone-06','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000007','agent-07','Agente 07','+51999000007','provider-phone-07','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000008','agent-08','Agente 08','+51999000008','provider-phone-08','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000009','agent-09','Agente 09','+51999000009','provider-phone-09','CONNECTED',now(),now()),
('10000000-0000-0000-0000-000000000010','agent-10','Agente 10','+51999000010','provider-phone-10','CONNECTED',now(),now())
ON CONFLICT ("code") DO NOTHING;

-- Scope: agente operativo 01 solo sobre agent-01
INSERT INTO "user_agent_access" ("user_id", "agent_id")
VALUES ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001')
ON CONFLICT ("user_id","agent_id") DO NOTHING;
