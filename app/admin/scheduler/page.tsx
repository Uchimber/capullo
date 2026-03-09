import AdminSchedulerClient from "@/components/AdminSchedulerClient";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function AdminSchedulerPage() {
  const [services, bookings] = await Promise.all([
    prisma.service.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.booking.findMany({
      include: { service: true },
      orderBy: { startTime: "asc" },
    })
  ]);

  return <AdminSchedulerClient services={services} initialBookings={bookings} />;
}
