"use client";

import Link from "next/link";
import { Route } from "next";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ReactNode } from "react";
import { canRunBackups, canRunReports, canSeeMcp } from "@/lib/auth/permissions";
import { AppRole } from "@/lib/types/auth";
import { cn } from "@/lib/utils/cn";

interface AppShellProps {
  user: {
    email?: string | null;
    role: AppRole;
    agentScopes: string[];
  };
  children: ReactNode;
}

interface NavItem {
  href: Route;
  label: string;
  show: boolean;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/agents", label: "Agentes", show: true },
    { href: "/conversations", label: "Conversaciones", show: true },
    { href: "/reports", label: "Reportes", show: canRunReports(user.role) },
    { href: "/backups", label: "Backups", show: canRunBackups(user.role) },
    { href: "/ai", label: "Asistente IA", show: true },
    { href: "/mcp", label: "MCP", show: canSeeMcp(user.role) },
  ];

  return (
    <div className="page-shell">
      <div className="app-grid">
        <aside
          className="card"
          style={{
            padding: 16,
            position: "sticky",
            top: 14,
            alignSelf: "start",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Console</h2>
          <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            {user.email}
          </p>
          <p className="badge mono" style={{ marginTop: 10 }}>
            {user.role}
          </p>
          <nav style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {navItems
              .filter((item) => item.show)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("btn secondary", pathname === item.href && "mono")}
                  style={{
                    textAlign: "left",
                    fontWeight: pathname === item.href ? 600 : 500,
                    background: pathname === item.href ? "rgba(18,95,74,0.08)" : "#fff",
                  }}
                >
                  {item.label}
                </Link>
              ))}
          </nav>
          <button
            className="btn danger"
            style={{ marginTop: 16, width: "100%" }}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Cerrar sesión
          </button>
        </aside>

        <section className="grid">{children}</section>
      </div>
    </div>
  );
}
