"use client";

import { CSSProperties, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useApiClient } from "@/lib/api/use-api-client";
import { DashboardOverview, WAAgent } from "@/lib/types/domain";
import { SectionHeader } from "@/components/ui/section-header";
import { StatCard } from "@/components/ui/stat-card";

export default function DashboardPage() {
  const { data } = useSession();
  const client = useApiClient();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [agents, setAgents] = useState<WAAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, ag] = await Promise.all([
          client.dashboardOverview(),
          client.listAgents(),
        ]);
        if (!mounted) return;
        setOverview(ov);
        setAgents(ag);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar dashboard.");
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
        title="Dashboard Operativo"
        subtitle={`Perfil: ${data?.user.role ?? "N/A"} | Agentes visibles: ${data?.user.role === "AGENT_OPERATIVE" ? data.user.agentScopes.length : 10}`}
      />

      {error ? (
        <article className="card" style={{ padding: 16, color: "var(--danger)" }}>
          {error}
        </article>
      ) : null}

      <section
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <StatCard
          label="Mensajes entrantes"
          value={loading ? "..." : overview?.totalMessagesIn ?? 0}
        />
        <StatCard
          label="Mensajes salientes"
          value={loading ? "..." : overview?.totalMessagesOut ?? 0}
        />
        <StatCard
          label="Conversaciones abiertas"
          value={loading ? "..." : overview?.openConversations ?? 0}
        />
        <StatCard
          label="Agentes conectados"
          value={loading ? "..." : overview?.connectedAgents ?? 0}
        />
        <StatCard
          label="Tasa de error"
          value={loading ? "..." : `${((overview?.errorRate ?? 0) * 100).toFixed(2)}%`}
        />
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Estado de Agentes</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Código</th>
                <th style={th}>Nombre</th>
                <th style={th}>Número</th>
                <th style={th}>Estado</th>
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
                    <span className={`badge ${agent.status === "CONNECTED" ? "status-ok" : "status-danger"}`}>
                      {agent.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && agents.length === 0 ? (
                <tr>
                  <td style={td} colSpan={4}>
                    Sin agentes disponibles.
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
