"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { SectionHeader } from "@/components/ui/section-header";
import { useApiClient } from "@/lib/api/use-api-client";
import { Conversation, Message, WAAgent } from "@/lib/types/domain";

export default function ConversationsPage() {
  const { data } = useSession();
  const client = useApiClient();
  const [agents, setAgents] = useState<WAAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    if (!client) return;
    let mounted = true;
    (async () => {
      try {
        const loadedAgents = await client.listAgents();
        if (!mounted) return;
        setAgents(loadedAgents);
        const firstAgent = loadedAgents[0]?.id ?? "";
        setSelectedAgentId(firstAgent);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar agentes.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client]);

  useEffect(() => {
    if (!client || !selectedAgentId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const response = await client.listConversations(selectedAgentId);
        if (!mounted) return;
        setConversations(response.items);
        const first = response.items[0]?.id ?? "";
        setSelectedConversationId(first);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar conversaciones.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client, selectedAgentId]);

  useEffect(() => {
    if (!client || !selectedConversationId) return;
    let mounted = true;
    (async () => {
      try {
        const loadedMessages = await client.listMessages(selectedConversationId);
        if (!mounted) return;
        setMessages(loadedMessages);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "No se pudieron cargar mensajes.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [client, selectedConversationId]);

  async function handleSendText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !selectedAgentId || !selectedConversationId || !text.trim()) return;
    setLoading(true);
    setError("");
    try {
      await client.sendText({
        agentId: selectedAgentId,
        conversationId: selectedConversationId,
        text: text.trim(),
      });
      const refreshed = await client.listMessages(selectedConversationId);
      setMessages(refreshed);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el texto.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMedia() {
    if (!client || !selectedAgentId || !selectedConversationId || !mediaFile) return;
    setLoading(true);
    setError("");
    try {
      await client.sendMedia({
        agentId: selectedAgentId,
        conversationId: selectedConversationId,
        file: mediaFile,
        caption: text || undefined,
      });
      const refreshed = await client.listMessages(selectedConversationId);
      setMessages(refreshed);
      setMediaFile(null);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar media.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAIHelper() {
    if (!client || !aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const response = await client.aiChat({
        provider: "openai",
        model: "gpt-4.1-mini",
        prompt: aiPrompt,
        agentScopeId:
          data?.user.role === "AGENT_OPERATIVE"
            ? data.user.agentScopes[0]
            : selectedAgentId || undefined,
        useTools: data?.user.role !== "AGENT_OPERATIVE",
        temperature: 0.2,
      });
      setAiResponse(response.output);
    } catch (err) {
      setAiResponse(err instanceof Error ? err.message : "Error consultando IA.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <>
      <SectionHeader
        title="Centro de Conversaciones"
        subtitle="Inbox operativo con soporte de texto, multimedia y asistente IA."
        actions={
          <div style={{ minWidth: 230 }}>
            <select
              className="select"
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.displayName} ({agent.code})
                </option>
              ))}
            </select>
          </div>
        }
      />

      {error ? (
        <article className="card" style={{ padding: 12, color: "var(--danger)" }}>
          {error}
        </article>
      ) : null}

      <section className="chat-grid">
        <aside className="card" style={{ padding: 12 }}>
          <h3 style={{ marginTop: 0 }}>Conversaciones</h3>
          <div className="grid" style={{ maxHeight: 560, overflow: "auto" }}>
            {loading && conversations.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Cargando...</p>
            ) : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className="btn secondary"
                style={{
                  textAlign: "left",
                  background:
                    conversation.id === selectedConversationId
                      ? "rgba(18,95,74,0.08)"
                      : "#fff",
                }}
                onClick={() => setSelectedConversationId(conversation.id)}
              >
                <div style={{ fontWeight: 600 }}>
                  {conversation.customerName ?? conversation.customerWaId}
                </div>
                <div className="mono" style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  {conversation.customerWaId}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>
            Chat activo:{" "}
            {selectedConversation
              ? selectedConversation.customerName ?? selectedConversation.customerWaId
              : "N/A"}
          </h3>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 10,
              minHeight: 420,
              maxHeight: 420,
              overflow: "auto",
              display: "grid",
              gap: 8,
            }}
          >
            {messages.map((message) => (
              <article
                key={message.id}
                style={{
                  justifySelf: message.direction === "OUT" ? "end" : "start",
                  background:
                    message.direction === "OUT"
                      ? "rgba(18,95,74,0.12)"
                      : "rgba(255,123,47,0.14)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "8px 10px",
                  maxWidth: "72%",
                }}
              >
                <p style={{ margin: 0 }}>
                  {message.textContent ?? `[${message.messageType}]`}
                </p>
                <small className="mono" style={{ color: "var(--muted)" }}>
                  {message.createdAt}
                </small>
              </article>
            ))}
            {selectedConversationId && messages.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>No hay mensajes en esta conversación.</p>
            ) : null}
          </div>

          <form className="grid" onSubmit={handleSendText}>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Escribe un mensaje..."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="file"
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setMediaFile(event.target.files?.[0] ?? null)
                }
              />
              <button className="btn" type="submit" disabled={loading}>
                Enviar texto
              </button>
              <button
                className="btn secondary"
                type="button"
                onClick={handleSendMedia}
                disabled={loading || !mediaFile}
              >
                Enviar media
              </button>
            </div>
          </form>
        </main>

        <aside className="card" style={{ padding: 12, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>Asistente IA</h3>
          <textarea
            className="textarea"
            rows={6}
            placeholder="Consulta IA sobre contexto de cliente, SQL, MCP o reglas operativas..."
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
          />
          <button className="btn" onClick={handleAIHelper} disabled={aiLoading}>
            {aiLoading ? "Consultando..." : "Consultar IA"}
          </button>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              padding: 10,
              minHeight: 220,
              whiteSpace: "pre-wrap",
            }}
          >
            {aiResponse || "Respuesta de IA aparecerá aquí."}
          </div>
        </aside>
      </section>
    </>
  );
}
