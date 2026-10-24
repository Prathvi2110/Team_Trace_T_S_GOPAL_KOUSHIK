
import { redirect } from "next/navigation";
import { isAdmin } from "../../lib/admin-auth";
import WorkerApprovalList from "./worker-approval-list";
import BookingAssignment from "./booking-assignment";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authorized = await isAdmin();

  if (!authorized) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">
        KaamConnect Admin Dashboard
      </h1>

      <p className="mt-2">
        Administrator access verified.
      </p>

      <WorkerApprovalList />

      <BookingAssignment />
    </main>
  );
}
