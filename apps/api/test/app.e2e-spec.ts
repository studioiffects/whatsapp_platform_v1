import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

interface AuthContext {
  accessToken: string;
  refreshToken: string;
}

describe("WhatsApp Platform API (e2e)", () => {
  let app: INestApplication;
  let agentAuth: AuthContext;
  let supervisorAuth: AuthContext;
  let adminAuth: AuthContext;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();

    agentAuth = await loginAgent();
    supervisorAuth = await loginWith2FA("supervisor@platform.local", "ChangeMe123!");
    adminAuth = await loginWith2FA("admin@platform.local", "ChangeMe123!");
  });

  afterAll(async () => {
    await app.close();
  });

  it("auth flow: should login with 2FA and read profile", async () => {
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${adminAuth.accessToken}`)
      .expect(200);

    expect(me.body.email).toBe("admin@platform.local");
    expect(me.body.role).toBe("ADMIN_TECH");
    expect(me.body.mfaVerified).toBe(true);
  });

  it("agent scope: should list only scoped agent and deny cross-role endpoint", async () => {
    const agents = await request(app.getHttpServer())
      .get("/api/v1/wa-agents")
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .expect(200);

    expect(Array.isArray(agents.body)).toBe(true);
    expect(agents.body.length).toBe(1);

    await request(app.getHttpServer())
      .post("/api/v1/backups/run")
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .send({ backupType: "INCREMENTAL" })
      .expect(403);
  });

  it("conversation + messages: should list and send text for scoped agent", async () => {
    const conversations = await request(app.getHttpServer())
      .get("/api/v1/conversations?agentId=10000000-0000-0000-0000-000000000001")
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .expect(200);

    expect(conversations.body.items.length).toBeGreaterThan(0);
    const conversationId = conversations.body.items[0].id as string;

    await request(app.getHttpServer())
      .post("/api/v1/messages/send-text")
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .send({
        agentId: "10000000-0000-0000-0000-000000000001",
        conversationId,
        text: "Mensaje de prueba E2E",
      })
      .expect(201);

    const messages = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .expect(200);

    expect(messages.body.some((item: { textContent?: string }) => item.textContent === "Mensaje de prueba E2E")).toBe(true);
  });

  it("supervisor: should generate report and run/list backups", async () => {
    const report = await request(app.getHttpServer())
      .post("/api/v1/reports/generate")
      .set("Authorization", `Bearer ${supervisorAuth.accessToken}`)
      .send({
        type: "AGENT_ACTIVITY",
        from: new Date(Date.now() - 86400000).toISOString(),
        to: new Date().toISOString(),
        format: "CSV",
      })
      .expect(201);

    expect(report.body.reportId).toBeDefined();

    const backup = await request(app.getHttpServer())
      .post("/api/v1/backups/run")
      .set("Authorization", `Bearer ${supervisorAuth.accessToken}`)
      .send({ backupType: "INCREMENTAL", reason: "e2e" })
      .expect(201);

    expect(backup.body.id).toBeDefined();

    const list = await request(app.getHttpServer())
      .get("/api/v1/backups")
      .set("Authorization", `Bearer ${supervisorAuth.accessToken}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });

  it("ai + skills: should allow chat and skill execution", async () => {
    const ai = await request(app.getHttpServer())
      .post("/api/v1/ai/chat")
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .send({
        provider: "openai",
        model: "gpt-4.1-mini",
        prompt: "Resume el estado de mis conversaciones.",
      })
      .expect(201);

    expect(ai.body.output).toBeDefined();

    const skill = await request(app.getHttpServer())
      .post("/api/v1/skills/execute")
      .set("Authorization", `Bearer ${agentAuth.accessToken}`)
      .send({
        skillId: "crm-lookup",
        input: { customerId: "51911111111" },
      })
      .expect(201);

    expect(skill.body.skillId).toBe("crm-lookup");
    expect(skill.body.auditId).toBeDefined();
  });

  it("admin mcp: should create and list MCP connections", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/mcp/connections")
      .set("Authorization", `Bearer ${adminAuth.accessToken}`)
      .send({
        name: "crm-main",
        endpoint: "https://mcp.example.local",
        authType: "NONE",
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get("/api/v1/mcp/connections")
      .set("Authorization", `Bearer ${adminAuth.accessToken}`)
      .expect(200);

    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBeGreaterThan(0);
  });

  it("webhook: should accept whatsapp event", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/webhooks/whatsapp")
      .set("x-provider-signature", "sig-demo")
      .set("x-provider-timestamp", `${Date.now()}`)
      .send({
        eventType: "message.received",
        agentExternalId: "provider-phone-01",
        occurredAt: new Date().toISOString(),
        payload: {
          customerWaId: "51999990000",
          customerName: "Cliente E2E",
          text: "Hola desde webhook",
          providerMessageId: "wamid.in.e2e",
        },
      })
      .expect(201);
  });

  async function loginAgent(): Promise<AuthContext> {
    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "agente01@platform.local",
        password: "ChangeMe123!",
      })
      .expect(201);

    expect(loginResponse.body.requires2fa).toBe(false);

    return {
      accessToken: loginResponse.body.accessToken as string,
      refreshToken: loginResponse.body.refreshToken as string,
    };
  }

  async function loginWith2FA(email: string, password: string): Promise<AuthContext> {
    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(201);

    expect(loginResponse.body.requires2fa).toBe(true);
    expect(loginResponse.body.challengeToken).toBeDefined();

    const verified = await request(app.getHttpServer())
      .post("/api/v1/auth/2fa/verify")
      .send({
        challengeToken: loginResponse.body.challengeToken,
        code: "123456",
      })
      .expect(201);

    return {
      accessToken: verified.body.accessToken as string,
      refreshToken: verified.body.refreshToken as string,
    };
  }
});
