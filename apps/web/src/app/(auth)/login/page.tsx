import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main
      className="page-shell"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
      }}
    >
      <LoginForm />
    </main>
  );
}
