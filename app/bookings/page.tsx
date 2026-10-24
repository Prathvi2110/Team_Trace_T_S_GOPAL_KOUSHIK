
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BookingsPage() {
  const [service, setService] = useState("");
  const [address, setAddress] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    async function checkUser() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          setSignedIn(false);
        } else {
          setSignedIn(true);
        }
      } catch {
        setSignedIn(false);
      } finally {
        setChecking(false);
      }
    }

    void checkUser();
  }, []);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    if (!dateTime || new Date(dateTime) <= new Date()) {
      setMessage("Please choose a future date and time.");
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setSignedIn(false);
        throw new Error("Please sign in before creating a booking.");
      }

      const user = userData.user;

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

      if (profileError || !profile) {
        throw new Error(
          "Your profile was not found. Please contact the administrator."
        );
      }

      if (profile.role !== "customer") {
        throw new Error(
          "Only customer accounts can create bookings."
        );
      }

      const { error: bookingError } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          service_name: service.trim(),
          service_address: address.trim(),
          scheduled_at: new Date(dateTime).toISOString(),
          notes: notes.trim() || null,
          status: "pending",
        });

      if (bookingError) {
        throw bookingError;
      }

      setMessage(
        "Booking created successfully! Your request is pending."
      );
      setService("");
      setAddress("");
      setDateTime("");
      setNotes("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not create booking. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <main style={{ padding: 32 }}>Checking your account...</main>;
  }

  if (!signedIn) {
    return (
      <main style={styles.container}>
        <h1>Sign in required</h1>
        <p>Please sign in to request a service.</p>
        <a href="/login">Go to sign in</a>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <h1>Book a Service</h1>
      <p>Tell us what service you need.</p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="service">Service needed</label>
        <input
          id="service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="e.g. Electrician, plumber, cleaning"
          required
          maxLength={150}
          style={styles.input}
        />

        <label htmlFor="address">Service address</label>
        <textarea
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter the address where service is needed"
          required
          maxLength={500}
          style={styles.input}
          rows={3}
        />

        <label htmlFor="dateTime">Preferred date and time</label>
        <input
          id="dateTime"
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          min={new Date(Date.now() + 60000)
            .toISOString()
            .slice(0, 16)}
          required
          style={styles.input}
        />

        <label htmlFor="notes">Additional notes (optional)</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe the work or any special instructions"
          maxLength={1000}
          rows={4}
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Submitting..." : "Request Service"}
        </button>
      </form>

      <p role="status" aria-live="polite">{message}</p>
      <p><a href="/">Back to homepage</a></p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 520,
    margin: "40px auto",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    marginTop: 6,
    marginBottom: 18,
    border: "1px solid #ccc",
    borderRadius: 6,
    fontSize: 16,
  },
  button: {
    padding: "12px 20px",
    border: "none",
    borderRadius: 6,
    background: "#176b48",
    color: "white",
    fontSize: 16,
    cursor: "pointer",
  },
};
