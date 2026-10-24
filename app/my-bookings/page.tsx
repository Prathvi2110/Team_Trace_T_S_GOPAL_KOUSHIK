
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "../../lib/supabase-browser";

type Booking = {
  id: string;
  customer_id: string;
  worker_id: string | null;
  service_name: string;
  service_address: string;
  scheduled_at: string;
  agreed_price: number | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type WorkerProfile = {
  id: string;
  full_name: string | null;
};

const statusSteps = ["pending", "accepted", "in_progress", "completed"];

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "An unknown error occurred.";
  }
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workers, setWorkers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setError("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) throw userError;

      const user = userData.user;

      if (!user) {
        setUserEmail(null);
        setBookings([]);
        setWorkers({});
        return;
      }

      setUserEmail(user.email ?? null);

      const { data, error: bookingError } = await supabase
        .from("bookings")
        .select(
          "id, customer_id, worker_id, service_name, service_address, scheduled_at, agreed_price, status, notes, created_at"
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (bookingError) {
        throw new Error(
          `Bookings query failed (${bookingError.code ?? "unknown"}): ${bookingError.message}`
        );
      }

      const bookingList = (data ?? []) as Booking[];
      setBookings(bookingList);

      const workerIds = [
        ...new Set(
          bookingList
            .map((booking) => booking.worker_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      if (workerIds.length === 0) {
        setWorkers({});
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", workerIds);

      if (profileError) {
        throw new Error(
          `Worker profiles query failed (${profileError.code ?? "unknown"}): ${profileError.message}`
        );
      }

      const workerMap: Record<string, string> = {};

      ((profileData ?? []) as WorkerProfile[]).forEach((profile) => {
        workerMap[profile.id] =
          profile.full_name?.trim() || "Name not provided";
      });

      setWorkers(workerMap);
    } catch (err: unknown) {
      console.error("My Bookings error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBookings();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadBookings();
    });

    return () => subscription.unsubscribe();
  }, [loadBookings]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadBookings();
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <p>Loading your bookings...</p>
      </main>
    );
  }

  if (!userEmail) {
    return (
      <main style={styles.page}>
        <h1>My Bookings</h1>
        <p>Please sign in to view your service requests.</p>
        <a href="/login">Sign in</a>
      </main>
    );
  }

  const completedCount = bookings.filter(
    (booking) => booking.status === "completed"
  ).length;

  const activeCount = bookings.filter((booking) =>
    ["accepted", "in_progress"].includes(booking.status)
  ).length;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>My Bookings</h1>
          <p style={styles.muted}>Signed in as {userEmail}</p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={styles.button}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div role="alert" style={styles.error}>
          <strong>Could not load bookings:</strong>
          <p style={{ marginBottom: 0, overflowWrap: "anywhere" }}>{error}</p>
        </div>
      )}

      <section style={styles.summary}>
        <div style={styles.summaryCard}>
          <span style={styles.muted}>Total bookings</span>
          <strong style={styles.number}>{bookings.length}</strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.muted}>Active bookings</span>
          <strong style={styles.number}>{activeCount}</strong>
        </div>

        <div style={styles.summaryCard}>
          <span style={styles.muted}>Completed</span>
          <strong style={styles.number}>{completedCount}</strong>
        </div>
      </section>

      {bookings.length === 0 && !error ? (
        <section style={styles.empty}>
          <h2>No bookings yet</h2>
          <p>Your service requests will appear here.</p>
          <a href="/">Browse services</a>
        </section>
      ) : (
        <section style={styles.bookingList}>
          {bookings.map((booking) => {
            const currentStep = statusSteps.indexOf(booking.status);

            return (
              <article key={booking.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h2 style={styles.serviceName}>{booking.service_name}</h2>
                    <p style={styles.muted}>
                      Booking ID: {booking.id.slice(0, 8)}
                    </p>
                  </div>

                  <span style={styles.status}>
                    {formatStatus(booking.status)}
                  </span>
                </div>

                <div style={styles.details}>
                  <p>
                    <strong>Address:</strong>{" "}
                    {booking.service_address || "Not provided"}
                  </p>
                  <p>
                    <strong>Scheduled:</strong>{" "}
                    {formatDate(booking.scheduled_at)}
                  </p>
                  <p>
                    <strong>Agreed price:</strong>{" "}
                    {booking.agreed_price == null
                      ? "Not agreed yet"
                      : `₹${booking.agreed_price.toLocaleString("en-IN")}`}
                  </p>
                  <p>
                    <strong>Assigned Worker:</strong>{" "}
                    {!booking.worker_id
                      ? "Not assigned yet"
                      : workers[booking.worker_id] ??
                        "Worker profile not available"}
                  </p>

                  {booking.notes && (
                    <p>
                      <strong>Notes:</strong> {booking.notes}
                    </p>
                  )}
                </div>

                <div style={styles.progress}>
                  {statusSteps.map((step, index) => {
                    const isCancelled = booking.status === "cancelled";
                    const isDone =
                      !isCancelled &&
                      currentStep >= 0 &&
                      index <= currentStep;

                    return (
                      <div key={step} style={styles.progressStep}>
                        <span
                          style={{
                            ...styles.progressDot,
                            ...(isDone ? styles.progressDone : {}),
                            ...(isCancelled
                              ? styles.progressCancelled
                              : {}),
                          }}
                        >
                          {isDone ? "✓" : index + 1}
                        </span>
                        <span style={styles.progressLabel}>
                          {formatStatus(step)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {booking.status === "cancelled" && (
                  <p style={styles.cancelledText}>
                    This booking has been cancelled.
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}

      <footer style={styles.footer}>
        <a href="/">Back to homepage</a>
        {" · "}
        <a href="/login">Account</a>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1000,
    margin: "0 auto",
    padding: 24,
    fontFamily: "Arial, sans-serif",
    color: "#1f2937",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  title: { marginBottom: 8, fontSize: 32 },
  muted: { color: "#6b7280", fontSize: 14 },
  button: {
    padding: "10px 16px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
  },
  error: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
    overflowWrap: "anywhere",
  },
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  summaryCard: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 18,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
  },
  number: { fontSize: 28 },
  empty: {
    textAlign: "center",
    padding: 40,
    border: "1px solid #e5e7eb",
    borderRadius: 12,
  },
  bookingList: { display: "grid", gap: 18 },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 16,
  },
  serviceName: { margin: "0 0 6px", fontSize: 22 },
  status: {
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "6px 10px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  details: { lineHeight: 1.6, overflowWrap: "anywhere" },
  progress: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 24,
    paddingTop: 18,
    borderTop: "1px solid #e5e7eb",
  },
  progressStep: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    flex: 1,
    textAlign: "center",
  },
  progressDot: {
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#e5e7eb",
    color: "#4b5563",
    fontSize: 13,
    fontWeight: 600,
  },
  progressDone: { background: "#16a34a", color: "#fff" },
  progressCancelled: { background: "#fee2e2", color: "#b91c1c" },
  progressLabel: { fontSize: 12, color: "#6b7280" },
  cancelledText: { color: "#b91c1c", fontWeight: 600 },
  footer: {
    marginTop: 28,
    paddingTop: 18,
    borderTop: "1px solid #e5e7eb",
  },
};
