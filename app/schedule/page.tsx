'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar, Clock, MapPin, ArrowLeft, ArrowRight, Check, X } from 'lucide-react'
import Link from 'next/link'
import Swal from 'sweetalert2'

interface Field {
  id: number
  name: string
  location: string
  price_per_hour: number
  image_url: string
  description: string
}

interface TimeSlot {
  time: string
  available: boolean
  price: number
  status: 'available' | 'booked'
  reservationId?: number
}

interface ScheduleData {
  date: string
  timeSlots: TimeSlot[]
}

/* ---------- konstanta rentang waktu baru ---------- */
const START_HOUR = 8   // 08:00
const END_HOUR   = 22  // hingga 22:00 (slot terakhir 21:00-22:00)

export default function SchedulePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fieldId = searchParams.get('fieldId')

  const [field, setField] = useState<Field | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([])
  const [scheduleData, setScheduleData] = useState<ScheduleData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showCalendar, setShowCalendar] = useState(true)

  /* -------------------------------------------------- */
  /* helper: kalender & tanggal                         */
  /* -------------------------------------------------- */
  const generateDates = () => {
    const dates = []
    const today = new Date()
    for (let week = 0; week < 4; week++) {
      const weekDates = []
      for (let day = 0; day < 7; day++) {
        const date = new Date(today)
        date.setDate(today.getDate() + week * 7 + day)
        weekDates.push(date)
      }
      dates.push(weekDates)
    }
    return dates
  }
  const dates = generateDates()

  const formatDate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  }
  const parseDateString = (str: string) => {
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const formatDisplayDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()
  const isPast  = (d: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return d < today
  }

  /* -------------------------------------------------- */
  /* fetch data                                         */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (!fieldId) { router.push('/fields'); return }
    fetchFieldData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldId])

  const fetchFieldData = async () => {
    try {
      const res = await fetch(`/api/fields?id=${fieldId}`)
      if (!res.ok) { router.push('/fields'); return }
      const json = await res.json()
      setField(json.field)
      await fetchScheduleData(json.field.id)
    } catch (e) {
      console.error(e)
      router.push('/fields')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchScheduleData = async (id: number) => {
    try {
      const res = await fetch(`/api/schedule?fieldId=${id}&t=${Date.now()}`)
      if (res.ok) {
        const json = await res.json()
        setScheduleData(json.schedule)
      }
    } catch (e) {
      console.error(e)
    }
  }

  /* -------------------------------------------------- */
  /* kalender bulanan                                   */
  /* -------------------------------------------------- */
  const generateCalendarDays = () => {
    const y = currentMonth.getFullYear()
    const m = currentMonth.getMonth()
    const firstDay = new Date(y, m, 1)
    const lastDay  = new Date(y, m + 1, 0)
    const startDay = firstDay.getDay()
    const daysInMonth = lastDay.getDate()

    const days: (Date | null)[] = Array(startDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(y, m, d))
    return days
  }

  const handlePrevMonth = () => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() - 1)
    const today = new Date()
    if (next.getFullYear() < today.getFullYear() ||
       (next.getFullYear() === today.getFullYear() && next.getMonth() < today.getMonth())) return
    setCurrentMonth(next)
  }
  const handleNextMonth = () => {
    const next = new Date(currentMonth)
    next.setMonth(next.getMonth() + 1)
    setCurrentMonth(next)
  }
  const handleDateSelect = (d: Date | null) => {
    if (!d || isPast(d)) return
    setSelectedDate(formatDate(d))
    setSelectedTimeSlots([])
    setShowCalendar(false)
  }

  /* -------------------------------------------------- */
  /* slot waktu                                         */
  /* -------------------------------------------------- */
const getTimeSlotsForDate = (d: Date): TimeSlot[] => {
  const dateStr = formatDate(d)
  const dayData = scheduleData.find(s => s.date === dateStr)

  const slots: TimeSlot[] = []

  // generate dari 08:00 s/d 22:00 (inklusif)
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    const time = `${h.toString().padStart(2, '0')}:00`
    const found = dayData?.timeSlots.find(t => t.time === time)

    if (found) {
      slots.push(found)
    } else {
      const isPastTime = isPast(d) && h < new Date().getHours()
      slots.push({
        time,
        available: !isPastTime,
        price: field?.price_per_hour ?? 0,
        status: !isPastTime ? 'available' : 'booked'
      })
    }
  }
  return slots
}

  const handleTimeSlotClick = (time: string) => {
    if (selectedTimeSlots.length === 0) {
      setSelectedTimeSlots([time])
      return
    }
    if (selectedTimeSlots.includes(time)) {
      setSelectedTimeSlots([]); return
    }
    // range selection
    const all = getTimeSlotsForDate(parseDateString(selectedDate))
    const first = selectedTimeSlots[0]
    const a = all.findIndex(s => s.time === first)
    const b = all.findIndex(s => s.time === time)
    if (a === -1 || b === -1) return
    const start = Math.min(a, b)
    const end   = Math.max(a, b)
    const range: string[] = []
    for (let i = start; i <= end; i++) {
      if (all[i].available) range.push(all[i].time)
      else return // ada yg booked → batal
    }
    setSelectedTimeSlots(range)
  }

  /* -------------------------------------------------- */
  /* total harga                                        */
  /* -------------------------------------------------- */
  const calculateTotalPrice = () => {
    if (!field || selectedTimeSlots.length === 0) return 0
    const start = parseInt(selectedTimeSlots[0].split(':')[0])
    const end   = parseInt(selectedTimeSlots[selectedTimeSlots.length - 1].split(':')[0])
    return (end - start) * field.price_per_hour
  }

  /* -------------------------------------------------- */
  /* lanjut ke booking                                  */
  /* -------------------------------------------------- */
  const handleContinueToBooking = () => {
    if (!selectedDate || selectedTimeSlots.length === 0) return
    const params = new URLSearchParams({
      fieldId: fieldId!,
      date: selectedDate,
      startTime: selectedTimeSlots[0],
      endTime: selectedTimeSlots[selectedTimeSlots.length - 1],
      totalPrice: calculateTotalPrice().toString()
    })
    router.push(`/booking?${params.toString()}`)
  }

  /* -------------------------------------------------- */
  /* loading / empty state                              */
  /* -------------------------------------------------- */
  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
        <p className="text-gray-600">Memuat jadwal...</p>
      </div>
    </div>
  )
  if (!field) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Lapangan tidak ditemukan</h2>
        <Link href="/fields" className="btn-primary">Kembali ke Daftar Lapangan</Link>
      </div>
    </div>
  )

  /* -------------------------------------------------- */
  /* render utama                                       */
  /* -------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/fields')} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{field.name}</h1>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{field.location}</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Harga per jam</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
                }).format(field.price_per_hour)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* bagian kiri: kalender / slot waktu */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {showCalendar ? 'Pilih Tanggal' : 'Pilih Waktu'}
                </h2>
                <div className="flex items-center space-x-2">
                  {!showCalendar && (
                    <button
                      onClick={() => setShowCalendar(true)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                    >
                      <Calendar className="w-4 h-4 inline mr-1" /> Ubah Tanggal
                    </button>
                  )}
                  <button
                    onClick={() => field && fetchScheduleData(field.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {/* kalender bulanan */}
              {showCalendar && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {currentMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                      <div key={d} className="text-center text-sm font-medium text-gray-500 py-2">{d}</div>
                    ))}
                    {generateCalendarDays().map((d, i) => {
                      if (!d) return <div key={`empty-${i}`} className="p-3" />
                      const disabled = isPast(d)
                      const selected = selectedDate === formatDate(d)
                      const today = isToday(d)
                      return (
                        <button
                          key={i}
                          onClick={() => handleDateSelect(d)}
                          disabled={disabled}
                          className={`
                            p-3 rounded-lg text-sm font-medium transition-all
                            ${selected ? 'bg-primary-600 text-white ring-2 ring-primary-300'
                              : disabled ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                              : today ? 'bg-blue-50 text-blue-600 border-2 border-blue-300 hover:bg-blue-100'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:ring-2 hover:ring-gray-200'}
                          `}
                        >
                          {d.getDate()}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Tips:</strong> Pilih tanggal pada kalender untuk melihat slot waktu yang tersedia
                    </p>
                  </div>
                </div>
              )}

              {/* slot waktu */}
              {!showCalendar && selectedDate && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Pilih Waktu - {parseDateString(selectedDate).toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Klik waktu mulai, lalu klik waktu akhir untuk memilih range. Contoh: 08:00 → 10:00 = 2 jam
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded" />
                        <span className="text-gray-600">Tersedia</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-primary-600 rounded" />
                        <span className="text-gray-600">Terpilih</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-3 h-3 bg-red-100 border border-red-200 rounded" />
                        <span className="text-gray-600">Terbooking</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    {getTimeSlotsForDate(parseDateString(selectedDate)).map(slot => {
                      const selected = selectedTimeSlots.includes(slot.time)
                      const first = selectedTimeSlots[0] === slot.time
                      const last = selectedTimeSlots[selectedTimeSlots.length - 1] === slot.time
                      const inRange = selectedTimeSlots.length > 1 && selected && !first && !last
                      return (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSlotClick(slot.time)}
                          disabled={!slot.available || slot.status === 'booked'}
                          className={`
                            p-3 rounded-lg text-sm font-medium transition-colors relative
                            ${selected ? 'bg-primary-600 text-white'
                              : slot.status === 'booked' ? 'bg-red-100 text-red-600 border border-red-200 cursor-not-allowed'
                              : slot.available ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                            ${first && selectedTimeSlots.length > 1 ? 'rounded-l-lg' : ''}
                            ${last && selectedTimeSlots.length > 1 ? 'rounded-r-lg' : ''}
                            ${inRange ? 'rounded-none' : ''}
                          `}
                        >
                          {selected && <Check className="w-4 h-4 absolute top-1 right-1" />}
                          {slot.status === 'booked' && <X className="w-4 h-4 absolute top-1 right-1" />}
                          <div>{slot.time}</div>
                          <div className="text-xs opacity-75">
                            {slot.status === 'booked'
                              ? 'Terbooking'
                              : new Intl.NumberFormat('id-ID', {
                                  style: 'currency', currency: 'IDR', minimumFractionDigits: 0
                                }).format(slot.price)}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ringkasan (kanan) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan</h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Lapangan</p>
                  <p className="font-medium text-gray-900">{field.name}</p>
                </div>

                {selectedDate && (
                  <div>
                    <p className="text-sm text-gray-600">Tanggal</p>
                    <p className="font-medium text-gray-900">
                      {parseDateString(selectedDate).toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                )}

                {selectedTimeSlots.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600">Waktu</p>
                    <p className="font-medium text-gray-900">
                      {selectedTimeSlots[0]} - {selectedTimeSlots[selectedTimeSlots.length - 1]}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(() => {
                        const start = parseInt(selectedTimeSlots[0].split(':')[0])
                        const end   = parseInt(selectedTimeSlots[selectedTimeSlots.length - 1].split(':')[0])
                        return `${end - start} jam`
                      })()}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency', currency: 'IDR', minimumFractionDigits: 0
                      }).format(calculateTotalPrice())}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleContinueToBooking}
                  disabled={!selectedDate || selectedTimeSlots.length === 0}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Lanjutkan ke Reservasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}