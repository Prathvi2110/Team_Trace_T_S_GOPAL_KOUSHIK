
import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/admin-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [bookingsResult, workersResult] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select(
          "id, service_name, service_address, scheduled_at, status, notes, created_at"
        )
        .eq("status", "pending")
        .is("worker_id", null)
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("profiles")
        .select("id, full_name")
        .eq("role", "worker")
        .eq("worker_approved", true)
        .order("full_name", { ascending: true }),
    ]);

    if (bookingsResult.error || workersResult.error) {
      console.error("Admin booking listing failed:", {
        bookings: bookingsResult.error?.message,
        workers: workersResult.error?.message,
      });

      return NextResponse.json(
        { error: "Could not load bookings or approved workers." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bookings: bookingsResult.data ?? [],
      workers: workersResult.data ?? [],
    });
  } catch (error) {
    console.error("Admin bookings API error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body: { bookingId?: unknown; workerId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { bookingId, workerId } = body;

    if (!isUuid(bookingId) || !isUuid(workerId)) {
      return NextResponse.json(
        { error: "Valid bookingId and workerId are required." },
        { status: 400 }
      );
    }

    const { data: worker, error: workerError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .eq("id", workerId)
      .eq("role", "worker")
      .eq("worker_approved", true)
      .maybeSingle();

    if (workerError) {
      console.error("Worker verification failed:", workerError.message);

      return NextResponse.json(
        { error: "Could not verify the worker." },
        { status: 500 }
      );
    }

    if (!worker) {
      return NextResponse.json(
        { error: "Approved worker not found." },
        { status: 400 }
      );
    }

    // Only assign a booking that is still pending and unassigned.
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .update({ worker_id: workerId })
      .eq("id", bookingId)
      .eq("status", "pending")
      .is("worker_id", null)
      .select("id, service_name, status, worker_id")
      .maybeSingle();

    if (bookingError) {
      console.error("Booking assignment failed:", bookingError.message);

      return NextResponse.json(
        { error: "Could not assign the booking." },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        {
          error:
            "Booking not found, already assigned, or no longer pending. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: `Booking assigned to ${worker.full_name || "the approved worker"}.`,
      booking,
    });
  } catch (error) {
    console.error("Admin booking assignment error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
