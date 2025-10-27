import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fieldId = searchParams.get('fieldId')

    if (!fieldId) {
      return NextResponse.json(
        { error: 'Field ID is required' },
        { status: 400 }
      )
    }

    // Get field data
    const field = await prisma.field.findFirst({
      where: {
        id: parseInt(fieldId),
        isActive: true
      }
    })

    if (!field) {
      return NextResponse.json(
        { error: 'Field not found' },
        { status: 404 }
      )
    }

    // Generate schedule for the next 28 days
    const schedule = []
    const today = new Date()
    
    for (let i = 0; i < 28; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Get existing reservations for this date
      // Check for PENDING or CONFIRMED status (payment status is separate)
      const reservations = await prisma.reservation.findMany({
        where: {
          fieldId: parseInt(fieldId),
          reservationDate: {
            gte: new Date(dateStr + 'T00:00:00.000Z'),
            lt: new Date(dateStr + 'T23:59:59.999Z')
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          paymentStatus: true,
          reservationDate: true
        }
      })

      // Debug logging
      console.log(`Checking date ${dateStr} for field ${fieldId}`)
      if (reservations.length > 0) {
        console.log(`Date ${dateStr}: Found ${reservations.length} reservations:`, reservations)
      } else {
        console.log(`Date ${dateStr}: No reservations found`)
      }

      // Generate time slots (6 AM to 10 PM)
      const timeSlots = []
      for (let hour = 6; hour < 22; hour++) {
        const timeStr = `${hour.toString().padStart(2, '0')}:00`
        
        // Check if this time slot is booked
        const bookedReservation = reservations.find(reservation => {
          const startHour = parseInt(reservation.startTime.split(':')[0])
          const endHour = parseInt(reservation.endTime.split(':')[0])
          const isBooked = hour >= startHour && hour < endHour
          
          if (isBooked) {
            console.log(`Slot ${timeStr} is booked by reservation ${reservation.id} (${reservation.startTime}-${reservation.endTime})`)
          }
          
          return isBooked
        })

        timeSlots.push({
          time: timeStr,
          available: !bookedReservation,
          price: field.pricePerHour,
          status: bookedReservation ? 'booked' : 'available',
          reservationId: bookedReservation ? bookedReservation.id : null
        })
      }

      schedule.push({
        date: dateStr,
        timeSlots
      })
    }

    return NextResponse.json({
      success: true,
      schedule,
      field: {
        id: field.id,
        name: field.name,
        location: field.location,
        price_per_hour: field.pricePerHour,
        image_url: field.imageUrl,
        description: field.description
      }
    })

  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
