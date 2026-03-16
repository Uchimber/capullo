import AdminSchedulerClient from "@/components/AdminSchedulerClient";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AdminSchedulerPage() {
  const [services, bookingsRaw] = await Promise.all([
    prisma.service.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: { not: "PENDING" } },
      include: { service: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const initialBookings = JSON.parse(JSON.stringify(bookingsRaw));

  return (
    <AdminSchedulerClient
      services={services}
      initialBookings={initialBookings}
    />
  );
}
