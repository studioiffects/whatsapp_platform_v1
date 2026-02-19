"use client";

import { CSSProperties, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiClient } from "@/lib/api/use-api-client";
import { BackupJob } from "@/lib/types/domain";

export default function BackupsPage() {
  const { data } = useSession();
  const client = useApiClient();
  const [jobs, setJobs] = useState<BackupJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadJobs() {
    if (!client) return;
    setLoading(true);
    setError("");
    try {
      const list = await client.listBackups();
      setJobs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar backups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, [client]);

  async function handleRun(type: "FULL" | "INCREMENTAL") {
    if (!client) return;
    setLoading(true);
    try {
      await client.runBackup(type, "manual from web");
      await loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error ejecutando backup.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(job: BackupJob) {
    if (!client) return;
    try {
      const result = await client.restoreBackup(job.id, "STAGING");
      window.alert(`Restore en cola: ${result.taskId}`);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "No se pudo restaurar.");
    }
  }

  if (data?.user.role === "AGENT_OPERATIVE") {
    return (
      <>
        <SectionHeader
          title="Backups y Restore"
          subtitle="Control de respaldo operativo con historial y recuperación en staging."
        />
        <article className="card" style={{ padding: 16, color: "var(--danger)" }}>
          Perfil sin permisos para ejecutar backups.
        </article>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title="Backups y Restore"
        subtitle="Control de respaldo operativo con historial y recuperación en staging."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn secondary" onClick={() => handleRun("INCREMENTAL")}>
              Backup incremental
            </button>
            <button className="btn" onClick={() => handleRun("FULL")}>
              Backup full
            </button>
          </div>
        }
      />

      {error ? (
        <article className="card" style={{ padding: 12, color: "var(--danger)" }}>
          {error}
        </article>
      ) : null}

      <section className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Historial</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>ID</th>
                <th style={th}>Tipo</th>
                <th style={th}>Estado</th>
                <th style={th}>Artefacto</th>
                <th style={th}>Checksum</th>
                <th style={th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td style={td} className="mono">
                    {job.id}
                  </td>
                  <td style={td}>{job.backupType}</td>
                  <td style={td}>
                    <span className={`badge ${job.status === "DONE" ? "status-ok" : ""}`}>
                      {job.status}
                    </span>
                  </td>
                  <td style={td} className="mono">
                    {job.artifactPath ?? "--"}
                  </td>
                  <td style={td} className="mono">
                    {job.checksum ?? "--"}
                  </td>
                  <td style={td}>
                    <button className="btn secondary" onClick={() => handleRestore(job)}>
                      Restore (staging)
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && jobs.length === 0 ? (
                <tr>
                  <td style={td} colSpan={6}>
                    Sin jobs de backup.
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
