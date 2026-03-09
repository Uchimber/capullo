'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { 
  addMinutes, 
  startOfDay, 
  endOfDay, 
  isBefore, 
  setHours, 
  setMinutes 
} from 'date-fns'

import { auth } from '@clerk/nextjs/server'

async function checkAdmin() {
  const session = await auth()
  const metadata = session.sessionClaims?.metadata as { role?: string } | undefined
  const role = metadata?.role
  if (role !== "admin") {
    throw new Error('Энэ үйлдлийг хийхэд админ эрх шаардлагатай.')
  }
}

// SERVICES
export async function createService(formData: FormData) {
  await checkAdmin()
  const name = formData.get('name') as string
  const duration = parseInt(formData.get('duration') as string)
  const price = parseFloat(formData.get('price') as string)
  const description = formData.get('description') as string

  await prisma.service.create({
    data: {
      name,
      duration,
      price,
      description
    }
  })

  revalidatePath('/admin/services')
}

export async function updateService(id: string, formData: FormData) {
  await checkAdmin()
  const name = formData.get('name') as string
  const duration = parseInt(formData.get('duration') as string)
  const price = parseFloat(formData.get('price') as string)
  const description = formData.get('description') as string

  await prisma.service.update({
    where: { id },
    data: {
      name,
      duration,
      price,
      description
    }
  })

  revalidatePath('/admin/services')
}

export async function deleteService(id: string) {
  await checkAdmin()
  await prisma.service.delete({
    where: { id }
  })
  revalidatePath('/admin/services')
}

// BOOKINGS
export async function createBooking(data: {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  startTime: Date;
}) {
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId }
  })

  if (!service) throw new Error('Үйлчилгээ олдсонгүй')

  const startTime = new Date(data.startTime)
  const endTime = new Date(startTime.getTime() + service.duration * 60000)

  // Senior Fix: Prevent Overlapping (Race Condition Check)
  // Check if slot is already occupied right before creating
  const existingBooking = await prisma.booking.findFirst({
    where: {
      status: { not: 'CANCELLED' },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime }
        }
      ]
    }
  })

  if (existingBooking) {
    throw new Error('Уучлаарай, энэ цаг саяхан захиалагдсан байна. Өөр цаг сонгоно уу.')
  }

  const booking = await prisma.booking.create({
    data: {
      serviceId: data.serviceId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      startTime: startTime,
      endTime: endTime,
      status: 'PENDING'
    }
  })

  // Consistently revalidate all relevant paths
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
  
  return booking
}

export async function blockSlot(data: {
  serviceId: string;
  startTime: Date;
}) {
  await checkAdmin()
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId }
  })
  if (!service) throw new Error('Үйлчилгээ олдсонгүй')

  const startTime = new Date(data.startTime)
  const endTime = new Date(startTime.getTime() + service.duration * 60000)

  // Use the same overlap check logic
  const existingBooking = await prisma.booking.findFirst({
    where: {
      status: { not: 'CANCELLED' },
      startTime: { lt: endTime },
      endTime: { gt: startTime }
    }
  })

  if (existingBooking) throw new Error('Энэ цаг өөр захиалгатай давхцаж байна.')

  await prisma.booking.create({
    data: {
      serviceId: data.serviceId,
      customerName: 'ЗАВГҮЙ / БЛОК',
      customerPhone: 'ADMIN',
      startTime,
      endTime,
      status: 'BLOCKED'
    }
  })

  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
}

export async function updateBookingStatus(id: string, status: string) {
  await checkAdmin()
  await prisma.booking.update({
    where: { id },
    data: { status }
  })
  revalidatePath('/admin/bookings')
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
}

export async function rescheduleBooking(id: string, newStartTime: Date) {
  await checkAdmin()
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true }
  })

  if (!booking) throw new Error('Захиалга олдсонгүй')
// ... (omitting identical rest of the code in replacement chunks for brevity if not changing but here I change) 
// wait, I need to include the whole thing I want to keep
  const endTime = new Date(newStartTime.getTime() + booking.service.duration * 60000)

  // Overlap check for rescheduling too
  const existingBooking = await prisma.booking.findFirst({
    where: {
      id: { not: id },
      status: { not: 'CANCELLED' },
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: newStartTime }
        }
      ]
    }
  })

  if (existingBooking) {
    throw new Error('Энэ цаг өөр захиалгатай давхцаж байна.')
  }

  await prisma.booking.update({
    where: { id },
    data: {
      startTime: newStartTime,
      endTime: endTime
    }
  })

  revalidatePath('/admin/bookings')
  revalidatePath('/admin/scheduler')
  revalidatePath('/admin')
}

// WORKING HOURS
export async function updateAllWorkingHours(formData: FormData) {
  await checkAdmin()
  const updates = []
  
  for (let i = 0; i < 7; i++) {
    const startTime = formData.get(`startTime_${i}`) as string
    const endTime = formData.get(`endTime_${i}`) as string
    const isActive = formData.get(`isActive_${i}`) === 'on'

    if (startTime && endTime) {
      updates.push(
        prisma.workingHours.upsert({
          where: { dayOfWeek: i },
          update: { startTime, endTime, isActive },
          create: { dayOfWeek: i, startTime, endTime, isActive }
        })
      )
    }
  }

  // Senior Fix: Use Transaction for atomic mass updates
  await prisma.$transaction(updates)
  
  revalidatePath('/admin/settings')
}

export async function getAvailableSlots(date: Date, serviceId: string, isAdmin: boolean = false) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId }
  })
  if (!service) return []

  const dayOfWeek = date.getDay()
  const workingHours = await prisma.workingHours.findUnique({
    where: { dayOfWeek }
  })

  if (!workingHours || !workingHours.isActive) return []

  const bookings = await prisma.booking.findMany({
    where: {
      startTime: {
        gte: startOfDay(date),
        lte: endOfDay(date)
      },
      status: { not: 'CANCELLED' }
    }
  })

  const slots = []
  const [startHour, startMin] = workingHours.startTime.split(':').map(Number)
  const [endHour, endMin] = workingHours.endTime.split(':').map(Number)

  let currentSlot = setMinutes(setHours(startOfDay(date), startHour), startMin)
  const endLimit = setMinutes(setHours(startOfDay(date), endHour), endMin)

  const now = new Date()
  const bufferTime = isAdmin ? now : addMinutes(now, 120) // 2 hour buffer for public

  while (isBefore(currentSlot, endLimit)) {
    const slotEnd = addMinutes(currentSlot, service.duration)
    
    if (isBefore(endLimit, slotEnd)) break

    // Check if slot is in the past or within buffer (if not admin)
    const isPastOrBuffered = isBefore(currentSlot, bufferTime)

    const isOccupied = bookings.some((booking) => {
      const bStart = new Date(booking.startTime)
      const bEnd = new Date(booking.endTime)
      // Overlap check
      return (currentSlot < bEnd && slotEnd > bStart)
    })

    if (!isOccupied && !isPastOrBuffered) {
      slots.push(new Date(currentSlot))
    }

    currentSlot = addMinutes(currentSlot, 30) // 30 min intervals
  }

  return slots
}

// BUSINESS SETTINGS
export async function updateBusinessSettings(formData: FormData) {
  await checkAdmin()
  const phone = formData.get('phone') as string
  const address = formData.get('address') as string

  await prisma.businessSettings.upsert({
    where: { id: 'singleton' },
    update: { phone, address },
    create: { id: 'singleton', phone, address }
  })

  revalidatePath('/admin/settings')
  revalidatePath('/')
}

export async function getBusinessSettings() {
  const settings = await prisma.businessSettings.findUnique({
    where: { id: 'singleton' }
  })
  
  if (!settings) {
    return {
      phone: "98118008",
      address: "СБД 1-р хороо, 5-р хороолол 14251, Чингисийн өргөн чөлөө. \"Бизнес плаза\" төв. 302 тоот өрөө."
    }
  }
  
  return settings
}

// BONUM PAYMENT INTEGRATION
const BONUM_TERMINAL_ID = "17172267"
const BONUM_SECRET_KEY = "1fc53f9389f489ff6e04617bd6338a710e1e7c579cb572aec421f560f363119c0e0039e4b765e53c5339c1e6c7727985a488ab4ac8141140571256af36c3f410421b2ff278fb499b10e3bdb7d3236212"
const BONUM_BASE_URL = "https://apis.bonum.mn"

import crypto from 'crypto'

function generateChecksum(body: Record<string, unknown>): string {
  const rawBody = JSON.stringify(body)
  return crypto
    .createHmac('sha256', BONUM_SECRET_KEY)
    .update(rawBody)
    .digest('hex')
}

export async function createBonumInvoice(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { service: true }
  })

  if (!booking) throw new Error('Захиалга олдсонгүй')

  // 1. Get Access Token
  const authRes = await fetch(`${BONUM_BASE_URL}/bonum-gateway/ecommerce/auth/create`, {
    method: 'GET',
    headers: {
      'Authorization': `AppSecret ${BONUM_SECRET_KEY}`,
      'X-TERMINAL-ID': BONUM_TERMINAL_ID
    }
  })

  if (!authRes.ok) {
    const errorText = await authRes.text()
    console.error('Bonum Auth Error:', errorText)
    throw new Error('Төлбөрийн системтэй холбогдоход алдаа гарлаа (Auth)')
  }

  const { accessToken } = await authRes.json()

  // 2. Create Invoice
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const body = {
    amount: booking.service.price,
    callback: `${baseUrl}/api/webhook/bonum`,
    transactionId: booking.id,
    expiresIn: 3600,
    items: [
      {
        title: booking.service.name,
        remark: `${booking.customerName} - ${booking.customerPhone}`,
        image: "https://capullo.mn/logo.png", // Optional but helps UX
        amount: booking.service.price,
        count: 1
      }
    ]
  }

  const checksum = generateChecksum(body)

  const invoiceRes = await fetch(`${BONUM_BASE_URL}/bonum-gateway/ecommerce/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-checksum-v2': checksum
    },
    body: JSON.stringify(body)
  })

  if (!invoiceRes.ok) {
    const errorText = await invoiceRes.text()
    console.error('Bonum Invoice Error:', errorText)
    throw new Error('Нэхэмжлэх үүсгэхэд алдаа гарлаа')
  }

  const { followUpLink, invoiceId } = await invoiceRes.json()

  // Update booking with invoice ID for tracking
  await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentId: invoiceId }
  })

  return followUpLink
}
