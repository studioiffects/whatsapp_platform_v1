import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        email: session.user.email,
        role: session.user.role,
        agentScopes: session.user.agentScopes,
      }}
    >
      {children}
    </AppShell>
  );
}
