
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser as supabase } from "../../lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getUser();

      if (mounted) {
        setCurrentEmail(data.user?.email ?? null);
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        if (!fullName.trim()) {
          setMessage("Please enter your full name.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setCurrentEmail(data.user?.email ?? email.trim());
          setMessage("Account created successfully!");
        } else {
          setMessage(
            "Account created. Check your email to confirm your account, then log in."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setCurrentEmail(data.user.email ?? email.trim());
        setMessage("Login successful!");
        router.push("/");
        router.refresh();
      }
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setCurrentEmail(null);
      setPassword("");
      setEmail("");
      setFullName("");
      setMode("login");
      setMessage("Signed out successfully. You can log in with another account.");
      router.refresh();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Could not sign out."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    boxSizing: "border-box",
    fontSize: "15px",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.7 : 1,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "white",
          padding: "32px",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ textAlign: "center", marginTop: 0 }}>
          KaamConnect
        </h1>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "24px",
          }}
        >
          {currentEmail
            ? "Your account"
            : mode === "login"
              ? "Log in to your account"
              : "Create your account"}
        </p>

        {currentEmail ? (
          <div>
            <div
              style={{
                padding: "16px",
                background: "#f0fdf4",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
                Session active
              </p>
              <p style={{ margin: 0, overflowWrap: "anywhere" }}>
                Signed in as <strong>{currentEmail}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              style={{
                ...buttonStyle,
                background: "#dc2626",
              }}
            >
              {loading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <label style={{ display: "block", marginBottom: "16px" }}>
                Full name
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  style={inputStyle}
                />
              </label>
            )}

            <label style={{ display: "block", marginBottom: "16px" }}>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                style={inputStyle}
              />
            </label>

            <label style={{ display: "block", marginBottom: "20px" }}>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>

            <p style={{ textAlign: "center", marginBottom: 0 }}>
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setMessage("");
                }}
                style={{
                  border: "none",
                  background: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          </form>
        )}

        {message && (
          <p
            role="status"
            style={{
              marginTop: "20px",
              padding: "12px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e40af",
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}

        <div
          style={{
            borderTop: "1px solid #eee",
            marginTop: "24px",
            paddingTop: "20px",
            textAlign: "center",
          }}
        >
          <Link href="/" style={{ color: "#2563eb" }}>
            Back to homepage
          </Link>
        </div>
      </section>
    </main>
  );
}
