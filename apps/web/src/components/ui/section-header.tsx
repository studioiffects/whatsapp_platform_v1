import { ReactNode } from "react";

export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className="card"
      style={{
        padding: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>{title}</h1>
        {subtitle ? (
          <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}
