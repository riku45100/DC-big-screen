import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · FourZero Project Dashboard" },
      { name: "description", content: "Sign in to change jobs, tasks and what each TV screen shows." },
      { property: "og:title", content: "Sign in · FourZero Project Dashboard" },
      { property: "og:description", content: "Sign in to change jobs, tasks and what each TV screen shows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? search["next"] : "",
  }),
  component: Auth,
});

/** Only same-origin paths are allowed as a return target. */
function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function Auth() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const target = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}${target}` },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("We emailed you a confirmation link. Open it, then sign in.");
          setMode("signin");
        } else {
          await navigate({ to: target });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: target });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  async function withProvider(provider: "google" | "lovable") {
    setNotice("");
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "Sign-in failed.");
      return;
    }
    if (result.redirected) return;
    await navigate({ to: target });
  }

  async function forgotPassword() {
    if (!email) {
      toast.error("Type your email address first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(target)}`,
    });
    if (error) toast.error(error.message);
    else setNotice("We emailed you a password reset link.");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="panel w-full max-w-md p-7">
        <p className="eyebrow">FourZero project workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in to make changes" : "Create an account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Anyone with the address can view the dashboard and the TVs. Only signed-in people can change jobs, tasks or
          screen settings.
        </p>

        <div className="mt-6 space-y-3">
          <button type="button" className="field w-full hover:border-primary" onClick={() => withProvider("google")} disabled={busy}>
            Continue with Google
          </button>
          <button type="button" className="field w-full hover:border-primary" onClick={() => withProvider("lovable")} disabled={busy}>
            Continue with Lovable
          </button>
        </div>

        <p className="my-6 text-center text-xs text-muted-foreground">or with your email address</p>

        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs text-muted-foreground">
            Email
            <input
              className="field mt-2 w-full"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Password
            <input
              className="field mt-2 w-full"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {notice && <p className="mt-4 text-sm text-primary">{notice}</p>}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setNotice("");
            }}
          >
            {mode === "signin" ? "Need an account?" : "Already have one? Sign in"}
          </button>
          {mode === "signin" && (
            <button type="button" className="hover:text-foreground" onClick={forgotPassword}>
              Forgot password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
