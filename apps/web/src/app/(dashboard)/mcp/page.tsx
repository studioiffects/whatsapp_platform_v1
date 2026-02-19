"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiClient } from "@/lib/api/use-api-client";
import { MCPConnection } from "@/lib/types/domain";

export default function MCPPage() {
  const { data } = useSession();
  const client = useApiClient();
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [name, setName] = useState("crm-primary");
  const [endpoint, setEndpoint] = useState("https://mcp.example.local");
  const [authType, setAuthType] = useState<"NONE" | "API_KEY" | "OAUTH">("NONE");
  const [error, setError] = useState("");

  async function loadConnections() {
    if (!client) return;
    try {
      const list = await client.listMcpConnections();
      setConnections(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar conexiones.");
    }
  }

  useEffect(() => {
    void loadConnections();
  }, [client]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setError("");
    try {
      await client.createMcpConnection({ name, endpoint, authType, enabled: true });
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear conexión.");
    }
  }

  if (data?.user.role === "AGENT_OPERATIVE") {
    return (
      <>
        <SectionHeader
          title="Conexiones MCP"
          subtitle="Registra y monitorea servidores MCP para tools y consultas externas."
        />
        <article className="card" style={{ padding: 16, color: "var(--danger)" }}>
          Perfil sin permisos para gestionar conexiones MCP.
        </article>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title="Conexiones MCP"
        subtitle="Registra y monitorea servidores MCP para tools y consultas externas."
      />

      {error ? (
        <article className="card" style={{ padding: 12, color: "var(--danger)" }}>
          {error}
        </article>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <article className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Nueva conexión</h3>
          <form className="grid" onSubmit={handleCreate}>
            <label>
              <div style={{ marginBottom: 6 }}>Nombre</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Endpoint</div>
              <input
                className="input mono"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Auth</div>
              <select
                className="select"
                value={authType}
                onChange={(e) => setAuthType(e.target.value as typeof authType)}
              >
                <option value="NONE">NONE</option>
                <option value="API_KEY">API_KEY</option>
                <option value="OAUTH">OAUTH</option>
              </select>
            </label>
            <button className="btn" type="submit">
              Registrar conexión
            </button>
          </form>
        </article>

        <article className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Conexiones registradas</h3>
          <div className="grid">
            {connections.map((connection) => (
              <article
                key={connection.id}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <p style={{ margin: 0, fontWeight: 700 }}>{connection.name}</p>
                <p className="mono" style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>
                  {connection.endpoint}
                </p>
                <p style={{ margin: "8px 0 0" }}>
                  <span className={`badge ${connection.enabled ? "status-ok" : "status-danger"}`}>
                    {connection.enabled ? "ENABLED" : "DISABLED"}
                  </span>
                </p>
              </article>
            ))}
            {connections.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Sin conexiones MCP registradas.</p>
            ) : null}
          </div>
        </article>
      </section>
    </>
  );
}
