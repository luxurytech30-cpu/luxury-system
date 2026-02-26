"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getToken, setToken } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";
import { errorMessage } from "@/lib/errorMessage";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ success: boolean; data: { token: string } }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) }
      );
      setToken(res.data.token);
      router.push("/dashboard");
    } catch (e: unknown) {
      setErr(errorMessage(e, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(circle_at_top,#e2e8f0,transparent_55%),linear-gradient(#f8fafc,#e2e8f0)] p-6">
      <Card className="w-full max-w-sm">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Luxury System</div>
            <h1 className="text-2xl font-bold">Admin Login</h1>
          </div>

          <div className="space-y-1">
            <label className="text-sm">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <Button disabled={loading} className="w-full">
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
