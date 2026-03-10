import { z } from "zod";

export const ServiceSchema = z.object({
  name: z.string().min(2, "Нэр дор хаяж 2 тэмдэгт байх ёстой"),
  duration: z.coerce.number().min(5, "Хугацаа 5 минутаас дээш байх ёстой"),
  price: z.coerce.number().min(0, "Үнэ 0-ээс бага байх боломжгүй"),
  description: z.string().optional().nullable(),
});

export const BookingSchema = z.object({
  serviceId: z.string().uuid("Үйлчилгээ сонгоно уу"),
  customerName: z.string().min(2, "Нэр дор хаяж 2 тэмдэгт байх ёстой"),
  customerPhone: z.string().regex(/^\d{8}$/, "Утасны дугаар 8 оронтой тоо байх ёстой"),
  startTime: z.coerce.date(),
});

export type ServiceValues = z.infer<typeof ServiceSchema>;
export type BookingValues = z.infer<typeof BookingSchema>;
