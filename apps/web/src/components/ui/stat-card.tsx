export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="card" style={{ padding: 16 }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.88rem" }}>{label}</p>
      <h3 style={{ margin: "8px 0 0", fontSize: "1.6rem" }}>{value}</h3>
      {hint ? (
        <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.85rem" }}>
          {hint}
        </p>
      ) : null}
    </article>
  );
}
