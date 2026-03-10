import { prisma } from "@/lib/prisma";
import AdminServicesClient from "@/components/AdminServicesClient";

export const dynamic = 'force-dynamic';

export default async function AdminServicesPage() {
  const services = await prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });

  return <AdminServicesClient initialServices={services} />;
}
