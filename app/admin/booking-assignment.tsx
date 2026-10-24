
"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  service_name: string;
  service_address: string | null;
  scheduled_at: string;
  status: string;
  notes: string | null;
  created_at: string;
};

type Worker = {
  id: string;
  full_name: string | null;
};

export default function BookingAssignment() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function loadData() {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/admin/bookings", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not load bookings.");
      }

      setBookings(result.bookings ?? []);
      setWorkers(result.workers ?? []);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function assignWorker(bookingId: string) {
    const workerId = selectedWorkers[bookingId];

    if (!workerId) {
      setIsError(true);
      setMessage("Please select a worker first.");
      return;
    }

    setBusyId(bookingId);
    setMessage("");
    setIsError(false);

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          workerId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not assign worker.");
      }

      setMessage(result.message || "Worker assigned successfully.");
      await loadData();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not assign worker."
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">
          Pending Booking Assignments
        </h2>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading || busyId !== null}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`my-4 rounded border p-3 ${
            isError
              ? "border-red-300 text-red-700"
              : "border-green-300 text-green-700"
          }`}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-4">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <p className="mt-4 rounded border p-4">
          No pending unassigned bookings found.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-lg border p-5"
            >
              <h3 className="text-lg font-semibold">
                {booking.service_name}
              </h3>

              <p className="mt-2">
                <strong>Booking ID:</strong> {booking.id.slice(0, 8)}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {booking.service_address || "Not provided"}
              </p>

              <p>
                <strong>Scheduled:</strong>{" "}
                {new Date(booking.scheduled_at).toLocaleString()}
              </p>

              <p>
                <strong>Status:</strong> {booking.status}
              </p>

              {booking.notes && (
                <p>
                  <strong>Notes:</strong> {booking.notes}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-3">
                <select
                  aria-label={`Select worker for booking ${booking.id.slice(0, 8)}`}
                  value={selectedWorkers[booking.id] || ""}
                  onChange={(event) =>
                    setSelectedWorkers((previous) => ({
                      ...previous,
                      [booking.id]: event.target.value,
                    }))
                  }
                  disabled={workers.length === 0 || busyId !== null}
                  className="min-w-56 rounded border px-3 py-2"
                >
                  <option value="">
                    Select an approved worker
                  </option>

                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.full_name || "Unnamed worker"}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => void assignWorker(booking.id)}
                  disabled={
                    !selectedWorkers[booking.id] ||
                    busyId !== null ||
                    workers.length === 0
                  }
                  className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  {busyId === booking.id
                    ? "Assigning..."
                    : "Assign Worker"}
                </button>
              </div>

              {workers.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  No approved workers are available. Approve a worker
                  first in the Worker Approvals section.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
