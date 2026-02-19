"use client";

import { FormEvent, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { loginRequest, verify2FARequest } from "@/lib/api/auth-api";

type Step = "credentials" | "twofactor";

export function LoginForm() {
  const [step, setStep] = useState<Step>("credentials");
  const [challengeToken, setChallengeToken] = useState<string>("");
  const [email, setEmail] = useState("admin@platform.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const subtitle = useMemo(
    () =>
      step === "credentials"
        ? "Ingresa tus credenciales para acceder a la consola."
        : "La cuenta requiere doble factor. Ingresa tu código 2FA.",
    [step],
  );

  async function handleCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await loginRequest(email, password);
      if (response.requires2fa && response.challengeToken) {
        setChallengeToken(response.challengeToken);
        setStep("twofactor");
        return;
      }

      if (!response.accessToken || !response.refreshToken) {
        throw new Error("No se recibieron tokens de sesión.");
      }

      const result = await signIn("credentials", {
        redirect: false,
        mode: "token",
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      if (result?.error) {
        throw new Error("No se pudo iniciar sesión en Auth.js.");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de autenticación.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const verified = await verify2FARequest(challengeToken, code);
      const result = await signIn("credentials", {
        redirect: false,
        mode: "token",
        accessToken: verified.accessToken,
        refreshToken: verified.refreshToken,
      });

      if (result?.error) {
        throw new Error("No se pudo completar la sesión.");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de validación 2FA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className="card"
      style={{
        width: "min(460px, 100%)",
        padding: 26,
        margin: "0 auto",
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <p className="badge" style={{ marginBottom: 8 }}>
          WhatsApp Multiagent
        </p>
        <h1 style={{ margin: 0, fontSize: "1.7rem" }}>Acceso Seguro</h1>
        <p style={{ marginTop: 8, color: "var(--muted)" }}>{subtitle}</p>
      </div>

      {step === "credentials" ? (
        <form className="grid" onSubmit={handleCredentials}>
          <label>
            <div style={{ marginBottom: 6 }}>Correo</div>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            <div style={{ marginBottom: 6 }}>Clave</div>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}
          <button className="btn" disabled={loading} type="submit">
            {loading ? "Validando..." : "Continuar"}
          </button>
        </form>
      ) : (
        <form className="grid" onSubmit={handleTwoFactor}>
          <label>
            <div style={{ marginBottom: 6 }}>Código 2FA</div>
            <input
              className="input mono"
              type="text"
              minLength={6}
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn secondary"
              type="button"
              onClick={() => {
                setStep("credentials");
                setCode("");
                setChallengeToken("");
              }}
            >
              Volver
            </button>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "Verificando..." : "Finalizar acceso"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
