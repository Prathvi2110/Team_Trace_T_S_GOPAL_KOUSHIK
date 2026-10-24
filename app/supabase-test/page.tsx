
"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function SupabaseTestPage() {
  const [message, setMessage] = useState("Not tested yet");
  const [loading, setLoading] = useState(false);

  async function testConnection() {
    setLoading(true);
    setMessage("Connecting to Supabase...");

    try {
      const { error } = await supabase
        .from("bookings")
        .select("id")
        .limit(1);

      if (error) {
        setMessage(
          `Supabase responded, but the query was blocked or failed: ${error.message}`
        );
      } else {
        setMessage(
          "Connection successful! Supabase responded to the bookings query."
        );
      }
    } catch {
      setMessage(
        "Could not connect. Check your Project URL, publishable key, and internet connection."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
      <h1>KaamConnect — Supabase Test</h1>
      <p>Test the connection without changing the homepage.</p>

      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Testing..." : "Test Supabase Connection"}
      </button>

      <p role="status" style={{ marginTop: 20 }}>
        {message}
      </p>
    </main>
  );
}
