"use client";

import { CSSProperties, useEffect, useState } from "react";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiClient } from "@/lib/api/use-api-client";
import { WAAgent } from "@/lib/types/domain";

interface HealthMap {
  [agentId: string]: { connected: boolean; latencyMs: number; lastSyncAt: string };
}

export default function AgentsPage() {
  const client = useApiClient();
  const [agents, setAgents] = useState<WAAgent[]>([]);
  const [health, setHealth] = useState<HealthMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await client.listAgents();
        if (!mounted) return;
        setAgents(list);
        const healthEntries = await Promise.all(
          list.map(async (agent) => [agent.id, await client.agentHealth(agent.id)] as const),
        );
        if (!mounted) return;
        setHealth(Object.fromEntries(healthEntries));
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar agentes.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client]);

  return (
    <>
      <SectionHeader
        title="Agentes WhatsApp"
        subtitle="Estado técnico y salud de conexión de los agentes habilitados."
      />
      {error ? (
        <article className="card" style={{ padding: 16, color: "var(--danger)" }}>
          {error}
        </article>
      ) : null}

      <section className="card" style={{ padding: 16 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Código</th>
                <th style={th}>Nombre</th>
                <th style={th}>Número</th>
                <th style={th}>Estado API</th>
                <th style={th}>Latencia</th>
                <th style={th}>Última sincronización</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id}>
                  <td style={td} className="mono">
                    {agent.code}
                  </td>
                  <td style={td}>{agent.displayName}</td>
                  <td style={td}>{agent.phoneNumber}</td>
                  <td style={td}>
                    <span className={`badge ${health[agent.id]?.connected ? "status-ok" : "status-danger"}`}>
                      {health[agent.id]?.connected ? "CONNECTED" : agent.status}
                    </span>
                  </td>
                  <td style={td}>{health[agent.id]?.latencyMs ?? "--"} ms</td>
                  <td style={td}>{health[agent.id]?.lastSyncAt ?? "--"}</td>
                </tr>
              ))}
              {!loading && agents.length === 0 ? (
                <tr>
                  <td style={td} colSpan={6}>
                    Sin agentes.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: "1px solid var(--line)",
  color: "var(--muted)",
  fontSize: "0.85rem",
};

const td: CSSProperties = {
  padding: "10px 6px",
  borderBottom: "1px solid var(--line)",
};
