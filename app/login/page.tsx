
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type UserRole = "customer" | "worker";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check the existing session and listen for sign-in/sign-out changes.
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) return;

        setSignedInEmail(
          error ? null : data.user?.email ?? null
        );
      } catch {
        if (mounted) setSignedInEmail(null);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSignedInEmail(session?.user?.email ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setMessage("Successfully signed in!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
              role,
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setMessage(
            `Account created as ${role}. You are signed in.`
          );
        } else {
          setMessage(
            `Sign-up submitted as ${role}. Check your email to confirm your account before signing in.`
          );
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
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

      setMessage("Signed out successfully.");
      setPassword("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not sign out."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 440,
        margin: "50px auto",
        padding: 24,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>KaamConnect</h1>

      {checkingSession ? (
        <p>Checking your session...</p>
      ) : signedInEmail ? (
        <section
          style={{
            padding: 16,
            marginBottom: 20,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          <h2>Welcome back!</h2>
          <p><strong>Session active</strong></p>
          <p>
            Signed in as: <strong>{signedInEmail}</strong>
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            style={{ padding: "10px 16px", cursor: "pointer" }}
          >
            {loading ? "Please wait..." : "Sign out"}
          </button>
        </section>
      ) : (
        <>
          <h2>{isLogin ? "Welcome back!" : "Create your account"}</h2>

          <p>
            {isLogin
              ? "Sign in to your KaamConnect account."
              : "Join your local community."}
          </p>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={100}
                    autoComplete="name"
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 10,
                      marginTop: 6,
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label htmlFor="role">I want to join as</label>
                  <select
                    id="role"
                    value={role}
                    onChange={(event) =>
                      setRole(event.target.value as UserRole)
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      padding: 10,
                      marginTop: 6,
                    }}
                  >
                    <option value="customer">
                      Customer — I need services
                    </option>
                    <option value="worker">
                      Worker — I provide services
                    </option>
                  </select>
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                style={{
                  display: "block",
                  width: "100%",
                  padding: 10,
                  marginTop: 6,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="password">
                Password (at least 8 characters)
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={isLogin ? "current-password" : "new-password"}
                style={{
                  display: "block",
                  width: "100%",
                  padding: 10,
                  marginTop: 6,
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "12px 18px",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p>
            <button
              type="button"
              onClick={() => {
                setIsLogin((current) => !current);
                setMessage("");
              }}
              style={{
                border: "none",
                background: "transparent",
                textDecoration: "underline",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {isLogin
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </p>
        </>
      )}

      <p role="status" aria-live="polite">{message}</p>

      <p style={{ marginTop: 24 }}>
        <a href="/">Back to homepage</a>
      </p>
    </main>
  );
}
