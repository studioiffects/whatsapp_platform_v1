"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiClient } from "@/lib/api/use-api-client";

export default function ReportsPage() {
  const { data } = useSession();
  const client = useApiClient();
  const [type, setType] =
    useState<"AGENT_ACTIVITY" | "CONVERSATIONS" | "SLA" | "AI_USAGE">(
      "AGENT_ACTIVITY",
    );
  const [format, setFormat] = useState<"CSV" | "PDF">("CSV");
  const [from, setFrom] = useState(() => new Date(Date.now() - 86400000).toISOString());
  const [to, setTo] = useState(() => new Date().toISOString());
  const [jobs, setJobs] = useState<Array<{ reportId: string; status: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setJobs([]);
  }, []);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client) return;
    setLoading(true);
    setError("");
    try {
      const job = await client.generateReport({ type, from, to, format });
      setJobs((prev) => [job, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar reporte.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(reportId: string) {
    if (!client) return;
    try {
      const result = await client.downloadReport(reportId);
      window.alert(`Reporte listo: ${result.filename} (${result.status})`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo descargar.");
    }
  }

  if (data?.user.role === "AGENT_OPERATIVE") {
    return (
      <>
        <SectionHeader
          title="Reportes Operativos"
          subtitle="Genera reportes de actividad, SLA, conversaciones y uso de IA."
        />
        <article className="card" style={{ padding: 16, color: "var(--danger)" }}>
          Perfil sin permisos para reportes globales.
        </article>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title="Reportes Operativos"
        subtitle="Genera reportes de actividad, SLA, conversaciones y uso de IA."
      />
      <section className="card" style={{ padding: 16 }}>
        <form className="grid" onSubmit={handleGenerate}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ marginBottom: 6 }}>Tipo</div>
              <select
                className="select"
                value={type}
                onChange={(event) => setType(event.target.value as typeof type)}
              >
                <option value="AGENT_ACTIVITY">AGENT_ACTIVITY</option>
                <option value="CONVERSATIONS">CONVERSATIONS</option>
                <option value="SLA">SLA</option>
                <option value="AI_USAGE">AI_USAGE</option>
              </select>
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Formato</div>
              <select
                className="select"
                value={format}
                onChange={(event) => setFormat(event.target.value as "CSV" | "PDF")}
              >
                <option value="CSV">CSV</option>
                <option value="PDF">PDF</option>
              </select>
            </label>
          </div>
          <label>
            <div style={{ marginBottom: 6 }}>Desde (ISO)</div>
            <input className="input mono" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <div style={{ marginBottom: 6 }}>Hasta (ISO)</div>
            <input className="input mono" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>

          {error ? <p style={{ margin: 0, color: "var(--danger)" }}>{error}</p> : null}
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Generando..." : "Generar reporte"}
          </button>
        </form>
      </section>

      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Historial de solicitudes</h3>
        <div className="grid">
          {jobs.map((job) => (
            <article
              key={job.reportId}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <p className="mono" style={{ margin: 0 }}>
                  {job.reportId}
                </p>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{job.status}</p>
              </div>
              <button className="btn secondary" onClick={() => handleDownload(job.reportId)}>
                Descargar
              </button>
            </article>
          ))}
          {jobs.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No hay reportes solicitados en esta sesión.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}
