
"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "../../lib/supabase-browser";

type Booking = {
  id: string;
  service_name: string;
  service_address: string | null;
  scheduled_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

type NextStatus = "accepted" | "in_progress" | "completed";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const nextStatus: Record<string, NextStatus | undefined> = {
  pending: "accepted",
  accepted: "in_progress",
  in_progress: "completed",
};

const buttonLabels: Record<NextStatus, string> = {
  accepted: "Accept Job",
  in_progress: "Start Job",
  completed: "Complete Job",
};

export default function WorkerDashboard() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [approved, setApproved] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState("");
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(
    null
  );

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        setSignedIn(false);
        setBookings([]);
        return;
      }

      setSignedIn(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, worker_approved")
        .eq("id", auth.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error("Could not load your profile.");
      }

      setIsWorker(profile.role === "worker");

      if (profile.role !== "worker") {
        setApproved(false);
        setBookings([]);
        return;
      }

      const isApproved = profile.worker_approved === true;
      setApproved(isApproved);

      if (!isApproved) {
        setBookings([]);
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, service_name, service_address, scheduled_at, status, notes, created_at"
        )
        .eq("worker_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookings((data ?? []) as Booking[]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load your dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const countStatus = (status: string) =>
    bookings.filter((booking) => booking.status === status).length;

  const updateJobStatus = async (
    bookingId: string,
    newStatus: NextStatus
  ) => {
    setUpdatingBookingId(bookingId);
    setMessage("");

    try {
      const response = await fetch(
        `/api/worker/bookings/${bookingId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update job status.");
      }

      setMessage("Job status updated successfully.");
      await loadDashboard();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setUpdatingBookingId(null);
    }
  };

  if (loading) {
    return <main style={styles.page}>Loading dashboard...</main>;
  }

  if (!signedIn) {
    return (
      <main style={styles.page}>
        <h1>Worker Dashboard</h1>
        <p>Please sign in to continue.</p>
        <a href="/login">Go to Login</a>
      </main>
    );
  }

  if (!isWorker) {
    return (
      <main style={styles.page}>
        <h1>Worker Dashboard</h1>
        <section style={styles.notice}>
          <h2>Worker account required</h2>
          <p>
            You are signed in with a customer account.
            Sign in with an approved worker account to view assigned jobs.
          </p>
        </section>
        <a href="/">Back to Home</a>
      </main>
    );
  }

  if (!approved) {
    return (
      <main style={styles.page}>
        <h1>Worker Dashboard</h1>
        <section style={styles.notice}>
          <h2>Approval pending</h2>
          <p>
            An administrator must approve your worker account
            before you can access assigned jobs.
          </p>
        </section>
        <a href="/">Back to Home</a>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.eyebrow}>KAAMCONNECT</p>
          <h1 style={styles.title}>Worker Dashboard</h1>
          <p style={styles.muted}>
            Manage and track your assigned service jobs.
          </p>
        </div>

        <button
          type="button"
          style={styles.button}
          disabled={loading || updatingBookingId !== null}
          onClick={() => void loadDashboard()}
        >
          Refresh Jobs
        </button>
      </header>

      {message && (
        <p role="status" style={styles.message}>
          {message}
        </p>
      )}

      <section style={styles.stats}>
        <StatCard label="Total Jobs" value={bookings.length} />
        <StatCard label="Pending" value={countStatus("pending")} />
        <StatCard label="In Progress" value={countStatus("in_progress")} />
        <StatCard label="Completed" value={countStatus("completed")} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Assigned Jobs</h2>

        {bookings.length === 0 ? (
          <div style={styles.empty}>
            <h3>No assigned jobs yet</h3>
            <p>Jobs assigned to your account will appear here.</p>
          </div>
        ) : (
          <div style={styles.jobs}>
            {bookings.map((booking) => {
              const action = nextStatus[booking.status];
              const isUpdating = updatingBookingId === booking.id;

              return (
                <article key={booking.id} style={styles.card}>
                  <div style={styles.jobHeader}>
                    <h3 style={styles.service}>
                      {booking.service_name}
                    </h3>

                    <span
                      style={{
                        ...styles.badge,
                        ...(booking.status === "completed"
                          ? styles.completed
                          : booking.status === "cancelled"
                            ? styles.cancelled
                            : booking.status === "in_progress"
                              ? styles.inProgress
                              : booking.status === "accepted"
                                ? styles.accepted
                                : styles.pending),
                      }}
                    >
                      {statusLabels[booking.status] ?? booking.status}
                    </span>
                  </div>

                  <p>
                    <strong>Scheduled:</strong>{" "}
                    {booking.scheduled_at
                      ? new Date(booking.scheduled_at).toLocaleString()
                      : "Not scheduled"}
                  </p>

                  <p>
                    <strong>Address:</strong>{" "}
                    {booking.service_address || "Not provided"}
                  </p>

                  {booking.notes && (
                    <p>
                      <strong>Customer notes:</strong> {booking.notes}
                    </p>
                  )}

                  <p style={styles.bookingId}>
                    Booking reference: {booking.id}
                  </p>

                  {action && (
                    <button
                      type="button"
                      style={{
                        ...styles.actionButton,
                        ...(isUpdating ? styles.disabledButton : {}),
                      }}
                      disabled={updatingBookingId !== null}
                      onClick={() =>
                        void updateJobStatus(booking.id, action)
                      }
                    >
                      {isUpdating ? "Updating..." : buttonLabels[action]}
                    </button>
                  )}

                  {booking.status === "completed" && (
                    <p style={styles.successText}>
                      This job has been completed.
                    </p>
                  )}

                  {booking.status === "cancelled" && (
                    <p style={styles.cancelledText}>
                      This booking has been cancelled.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <a href="/">Home</a>
        {" · "}
        <a href="/my-bookings">My Bookings</a>
      </footer>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article style={styles.statCard}>
      <p style={styles.statLabel}>{label}</p>
      <p style={styles.statValue}>{value}</p>
    </article>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1050,
    margin: "0 auto",
    padding: "32px 20px",
    fontFamily: "Arial, sans-serif",
    color: "#243229",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 28,
  },
  eyebrow: {
    color: "#28784c",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    margin: "8px 0",
  },
  muted: {
    color: "#647067",
  },
  button: {
    padding: "12px 18px",
    border: "none",
    borderRadius: 8,
    background: "#247647",
    color: "#fff",
    cursor: "pointer",
  },
  notice: {
    padding: 22,
    border: "1px solid #e3d49a",
    borderRadius: 12,
    background: "#fff9e8",
    marginBottom: 24,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 14,
    marginBottom: 36,
  },
  statCard: {
    padding: 20,
    border: "1px solid #e0e7e1",
    borderRadius: 12,
    background: "#f8fbf8",
  },
  statLabel: {
    color: "#647067",
    fontSize: 14,
    margin: 0,
  },
  statValue: {
    fontSize: 30,
    fontWeight: 700,
    margin: "12px 0 0",
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 23,
    marginBottom: 18,
  },
  empty: {
    textAlign: "center",
    padding: 36,
    border: "1px dashed #cbd5ce",
    borderRadius: 12,
  },
  jobs: {
    display: "grid",
    gap: 16,
  },
  card: {
    padding: 22,
    border: "1px solid #dce5dd",
    borderRadius: 12,
    background: "#fff",
    overflowWrap: "anywhere",
  },
  jobHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  service: {
    fontSize: 21,
    margin: "0 0 12px",
  },
  badge: {
    padding: "6px 11px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
  },
  pending: {
    background: "#fff1c9",
    color: "#765700",
  },
  accepted: {
    background: "#e3f5e8",
    color: "#20663a",
  },
  inProgress: {
    background: "#dcecff",
    color: "#174d91",
  },
  completed: {
    background: "#d9f4df",
    color: "#20663a",
  },
  cancelled: {
    background: "#ffe0e0",
    color: "#9b2525",
  },
  bookingId: {
    color: "#718078",
    fontSize: 12,
    marginTop: 18,
  },
  actionButton: {
    marginTop: 12,
    padding: "11px 16px",
    border: "none",
    borderRadius: 8,
    background: "#247647",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.6,
    cursor: "wait",
  },
  message: {
    padding: 14,
    background: "#eef8f0",
    color: "#20663a",
    borderRadius: 8,
    overflowWrap: "anywhere",
  },
  successText: {
    color: "#20663a",
    fontWeight: 600,
  },
  cancelledText: {
    color: "#9b2525",
    fontWeight: 600,
  },
  footer: {
    marginTop: 32,
  },
};
