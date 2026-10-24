
"use client";

import { useEffect, useState } from "react";

type Worker = {
  id: string;
  full_name: string | null;
  role: string;
  worker_approved: boolean;
  created_at: string;
};

export default function WorkerApprovalList() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadWorkers() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/workers");
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not load workers.");
        return;
      }

      setWorkers(result.workers || []);
      setMessage("");
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkers();
  }, []);

  async function updateApproval(
    workerId: string,
    approved: boolean
  ) {
    setBusyId(workerId);
    setMessage("");

    try {
      const response = await fetch("/api/admin/workers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workerId, approved }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Could not update worker.");
        return;
      }

      await loadWorkers();
      setMessage(result.message);
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="mt-6">Loading workers...</p>;
  }

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold">
        Worker Approvals
      </h2>

      {message && (
        <p className="my-4 rounded border p-3" role="status">
          {message}
        </p>
      )}

      {workers.length === 0 ? (
        <p className="mt-4">
          No worker profiles found yet.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {workers.map((worker) => (
            <article
              key={worker.id}
              className="rounded-lg border p-4"
            >
              <h3 className="text-lg font-medium">
                {worker.full_name || "Unnamed worker"}
              </h3>

              <p className="mt-1">
                Status:{" "}
                {worker.worker_approved
                  ? "Approved"
                  : "Awaiting approval"}
              </p>

              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={
                    worker.worker_approved ||
                    busyId === worker.id
                  }
                  onClick={() =>
                    updateApproval(worker.id, true)
                  }
                  className="rounded bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                >
                  {busyId === worker.id
                    ? "Updating..."
                    : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={
                    !worker.worker_approved ||
                    busyId === worker.id
                  }
                  onClick={() =>
                    updateApproval(worker.id, false)
                  }
                  className="rounded border px-4 py-2 disabled:opacity-50"
                >
                  Mark unapproved
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
