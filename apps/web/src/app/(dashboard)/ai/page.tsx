"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiClient } from "@/lib/api/use-api-client";

type ProviderName = "openai" | "gemini" | "claude" | "grok" | "ollama" | "llama_cpp";

export default function AIPage() {
  const { data } = useSession();
  const client = useApiClient();
  const [providers, setProviders] = useState<
    Array<{ name: ProviderName; enabled: boolean; defaultModel: string; health: string }>
  >([]);
  const [provider, setProvider] = useState<ProviderName>("openai");
  const [model, setModel] = useState("gpt-4.1-mini");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [skillResult, setSkillResult] = useState("");

  useEffect(() => {
    if (!client) return;
    void (async () => {
      try {
        const list = await client.listAiProviders();
        setProviders(list as Array<{ name: ProviderName; enabled: boolean; defaultModel: string; health: string }>);
        const first = list.find((item) => item.enabled);
        if (first) {
          setProvider(first.name as ProviderName);
          setModel(first.defaultModel);
        }
      } catch {
        setProviders([]);
      }
    })();
  }, [client]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !prompt.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const response = await client.aiChat({
        provider,
        model,
        prompt,
        agentScopeId:
          data?.user.role === "AGENT_OPERATIVE" ? data.user.agentScopes[0] : undefined,
        useTools: data?.user.role !== "AGENT_OPERATIVE",
      });
      setOutput(response.output);
    } catch (err) {
      setOutput(err instanceof Error ? err.message : "Error consultando IA.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkillDemo() {
    if (!client) return;
    try {
      const response = await client.executeSkill({
        skillId: "crm-lookup",
        input: { customerId: "51911111111" },
        agentScopeId:
          data?.user.role === "AGENT_OPERATIVE" ? data.user.agentScopes[0] : undefined,
      });
      setSkillResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setSkillResult(err instanceof Error ? err.message : "Error ejecutando skill.");
    }
  }

  return (
    <>
      <SectionHeader
        title="Asistente IA"
        subtitle="Consulta modelos externos y ejecuta skills operativas con control de rol."
      />

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        <article className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Consulta de modelo</h3>
          <form className="grid" onSubmit={handleSubmit}>
            <label>
              <div style={{ marginBottom: 6 }}>Proveedor</div>
              <select
                className="select"
                value={provider}
                onChange={(e) => {
                  const p = e.target.value as ProviderName;
                  setProvider(p);
                  const selected = providers.find((item) => item.name === p);
                  if (selected?.defaultModel) setModel(selected.defaultModel);
                }}
              >
                {providers.map((item) => (
                  <option key={item.name} value={item.name} disabled={!item.enabled}>
                    {item.name} ({item.health})
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Modelo</div>
              <input
                className="input mono"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>
            <label>
              <div style={{ marginBottom: 6 }}>Prompt</div>
              <textarea
                className="textarea"
                rows={6}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Procesando..." : "Consultar modelo"}
            </button>
          </form>
        </article>

        <article className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
          <h3 style={{ marginTop: 0 }}>Resultado</h3>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 12,
              minHeight: 230,
              whiteSpace: "pre-wrap",
            }}
          >
            {output || "La respuesta IA se mostrará aquí."}
          </div>
          <button className="btn secondary" onClick={handleSkillDemo}>
            Ejecutar skill demo
          </button>
          <pre
            className="mono"
            style={{
              margin: 0,
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 12,
              minHeight: 120,
              background: "#fafcf8",
              whiteSpace: "pre-wrap",
            }}
          >
            {skillResult || "Resultado de skill."}
          </pre>
        </article>
      </section>
    </>
  );
}
