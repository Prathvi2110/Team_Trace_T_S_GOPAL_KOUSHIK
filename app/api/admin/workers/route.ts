
import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/admin-auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authorized = await isAdmin();

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, worker_approved, created_at")
      .eq("role", "worker")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Worker listing failed:", error.message);

      return NextResponse.json(
        { error: "Could not load workers." },
        { status: 500 }
      );
    }

    return NextResponse.json({ workers: data });
  } catch (error) {
    console.error("Worker API error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authorized = await isAdmin();

    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    let body: { workerId?: unknown; approved?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    const { workerId, approved } = body;

    if (
      typeof workerId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workerId) ||
      typeof approved !== "boolean"
    ) {
      return NextResponse.json(
        { error: "A valid workerId and approved boolean are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ worker_approved: approved })
      .eq("id", workerId)
      .eq("role", "worker")
      .select("id, full_name, role, worker_approved")
      .maybeSingle();

    if (error) {
      console.error("Worker approval update failed:", error.message);

      return NextResponse.json(
        { error: "Could not update worker approval." },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Worker not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: approved
        ? "Worker approved successfully."
        : "Worker marked as unapproved.",
      worker: data,
    });
  } catch (error) {
    console.error("Worker approval API error:", error);

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
