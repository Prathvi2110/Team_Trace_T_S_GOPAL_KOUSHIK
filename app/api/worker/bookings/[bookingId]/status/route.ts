
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../../../../lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const allowedTransitions: Record<string, string> = {
  pending: "accepted",
  accepted: "in_progress",
  in_progress: "completed",
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in first." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, worker_approved")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      profile?.role !== "worker" ||
      profile.worker_approved !== true
    ) {
      return NextResponse.json(
        { error: "An approved worker account is required." },
        { status: 403 }
      );
    }

    const { bookingId } = await context.params;

    let body: { status?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const newStatus = body.status;

    if (
      typeof newStatus !== "string" ||
      !Object.values(allowedTransitions).includes(newStatus)
    ) {
      return NextResponse.json(
        { error: "Invalid job status." },
        { status: 400 }
      );
    }

    const expectedCurrentStatus = Object.keys(allowedTransitions).find(
      (status) => allowedTransitions[status] === newStatus
    );

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error("Missing server-side Supabase configuration.");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: booking, error: bookingError } = await adminClient
      .from("bookings")
      .select("id, worker_id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError) {
      console.error("Booking lookup failed:", bookingError.message);
      return NextResponse.json(
        { error: "Could not load the booking." },
        { status: 500 }
      );
    }

    if (!booking || booking.worker_id !== user.id) {
      return NextResponse.json(
        { error: "Assigned booking not found." },
        { status: 404 }
      );
    }

    if (booking.status !== expectedCurrentStatus) {
      return NextResponse.json(
        { error: "The booking status has changed. Refresh and try again." },
        { status: 409 }
      );
    }

    const { data: updatedBooking, error: updateError } = await adminClient
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId)
      .eq("worker_id", user.id)
      .eq("status", expectedCurrentStatus)
      .select("id, status")
      .maybeSingle();

    if (updateError) {
      console.error("Booking update failed:", updateError.message);
      return NextResponse.json(
        { error: "Could not update the booking." },
        { status: 500 }
      );
    }

    if (!updatedBooking) {
      return NextResponse.json(
        { error: "Booking changed. Refresh and try again." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Job status updated successfully.",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Worker booking status error:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
