'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Clock, Calendar, User, Phone, Mail } from 'lucide-react'
import Swal from 'sweetalert2'

interface Field {
  id: number
  name: string
  description: string
  location: string
  price_per_hour: number
  image_url?: string
  facilities: string[]
}

interface User {
  id: number
  name: string
  email: string
  phone?: string
  role: 'USER' | 'ADMIN'
}

export default function BookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fieldId = searchParams.get('fieldId') || searchParams.get('field')
  const date = searchParams.get('date')
  const startTime = searchParams.get('startTime')
  const endTime = searchParams.get('endTime')
  const totalPrice = searchParams.get('totalPrice')
  
  const [field, setField] = useState<Field | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: date || '',
    startTime: startTime || '',
    endTime: endTime || '',
    notes: ''
  })
  const [paymentProof, setPaymentProof] = useState<File | null>(null)
  const [paymentNotes, setPaymentNotes] = useState('')
  const [calculatedTotalPrice, setCalculatedTotalPrice] = useState(0)

  // Load user data and fetch field data
  useEffect(() => {
    const loadUserData = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          
          // Auto-fill form with user data
          setFormData(prev => ({
            ...prev,
            name: parsedUser.name || '',
            email: parsedUser.email || '',
            phone: parsedUser.phone || ''
          }))
        }
      } catch (error) {
        console.error('Error loading user data:', error)
      }
    }

    // Set total price from URL parameters if available
    if (totalPrice) {
      setCalculatedTotalPrice(parseInt(totalPrice))
    }

    const fetchField = async () => {
      if (!fieldId) {
        router.push('/fields')
        return
      }

      try {
        const response = await fetch(`/api/fields?id=${fieldId}`)
        if (response.ok) {
          const data = await response.json()
          setField(data.field)
        } else {
          router.push('/fields')
        }
      } catch (error) {
        console.error('Error fetching field:', error)
        router.push('/fields')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
    fetchField()
  }, [fieldId, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'File Tidak Valid',
          text: 'File harus berupa gambar (JPG, PNG, GIF)',
          confirmButtonColor: '#2563eb'
        })
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          icon: 'error',
          title: 'File Terlalu Besar',
          text: 'Ukuran file maksimal 5MB',
          confirmButtonColor: '#2563eb'
        })
        return
      }
      setPaymentProof(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // First create reservation
      const reservationResponse = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          field_id: fieldId,
          reservation_date: formData.date,
          start_time: formData.startTime,
          end_time: formData.endTime,
          total_price: calculateTotal(),
          notes: formData.notes
        })
      })

      if (!reservationResponse.ok) {
        const errorData = await reservationResponse.json()
        Swal.fire({
          icon: 'error',
          title: 'Reservasi Gagal',
          text: errorData.error || 'Terjadi kesalahan saat membuat reservasi',
          confirmButtonColor: '#2563eb'
        })
        return
      }

      const reservationData = await reservationResponse.json()
      const reservationId = reservationData.reservation.id

      // Upload payment proof if provided
      if (paymentProof) {
        console.log('Uploading payment proof for reservation:', reservationId)
        const formData = new FormData()
        formData.append('file', paymentProof)
        formData.append('reservationId', reservationId.toString())
        formData.append('paymentNotes', paymentNotes)

        try {
          const uploadResponse = await fetch('/api/reservations/upload-payment', {
            method: 'POST',
            body: formData
          })

          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json()
            console.log('Payment proof uploaded successfully:', uploadResult)
          } else {
            const errorData = await uploadResponse.json()
            console.error('Payment proof upload failed:', errorData)
            Swal.fire({
              icon: 'warning',
              title: 'Upload Bukti Gagal',
              text: errorData.error || 'Upload bukti pembayaran gagal, tapi reservasi sudah tersimpan',
              confirmButtonColor: '#2563eb'
            })
          }
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError)
          Swal.fire({
            icon: 'warning',
            title: 'Upload Error',
            text: 'Error saat upload bukti pembayaran: ' + uploadError.message,
            confirmButtonColor: '#2563eb'
          })
        }
      } else {
        console.log('No payment proof provided')
      }

      Swal.fire({
        icon: 'success',
        title: 'Reservasi Berhasil!',
        text: 'Bukti pembayaran telah dikirim untuk verifikasi. Kami akan menghubungi Anda segera.',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'OK'
      }).then(() => {
        router.push('/fields')
      })
    } catch (error) {
      console.error('Error submitting reservation:', error)
      Swal.fire({
        icon: 'error',
        title: 'Terjadi Kesalahan',
        text: 'Silakan coba lagi atau hubungi admin jika masalah berlanjut',
        confirmButtonColor: '#2563eb'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) {
      return 'Rp 0'
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price)
  }

  const calculateTotal = () => {
    // If total price is provided from schedule, use it
    if (calculatedTotalPrice > 0) {
      return calculatedTotalPrice
    }
    
    if (!field || !formData.startTime || !formData.endTime) return 0
    
    // Calculate hours based on time range (same logic as schedule)
    const startHour = parseInt(formData.startTime.split(':')[0])
    const endHour = parseInt(formData.endTime.split(':')[0])
    const hours = endHour - startHour
    
    return hours * field.price_per_hour
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="h-64 bg-gray-200 rounded mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!field) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lapangan Tidak Ditemukan</h1>
          <button
            onClick={() => router.push('/fields')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Kembali ke Daftar Lapangan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Reservasi Lapangan
          </h1>
          <p className="text-gray-600">
            Lengkapi data di bawah ini untuk menyelesaikan reservasi Anda
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Field Info & Schedule */}
          <div className="lg:col-span-1 space-y-6">
            {/* Field Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-4">
              {field.image_url ? (
                <img
                  src={field.image_url}
                  alt={field.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">{field.name}</span>
                </div>
              )}
              
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{field.name}</h3>
                
                <div className="flex items-start text-gray-600 mb-3">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{field.location}</span>
                </div>
                
                <div className="bg-primary-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Harga per jam</span>
                    <span className="text-xl font-bold text-primary-600">
                      {formatPrice(field.price_per_hour)}
                    </span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Fasilitas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {field.facilities.map((facility, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-md"
                      >
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Schedule Summary */}
                {date && startTime && endTime && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Jadwal Dipilih</h4>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Calendar className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Tanggal</p>
                          <p className="text-sm font-medium text-gray-900">
                            {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <Clock className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Waktu</p>
                          <p className="text-sm font-medium text-gray-900">
                            {startTime} - {endTime}
                            <span className="text-xs text-gray-500 ml-1">
                              ({(() => {
                                const startHour = parseInt(startTime.split(':')[0])
                                const endHour = parseInt(endTime.split(':')[0])
                                return endHour - startHour
                              })()} jam)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 mt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-900">Total Bayar</span>
                          <span className="text-lg font-bold text-blue-600">
                            {formatPrice(calculateTotal())}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="lg:col-span-2">
            {/* Booking Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
              <h3 className="text-xl font-semibold text-white">Form Reservasi</h3>
              <p className="text-primary-100 text-sm mt-1">Lengkapi data berikut untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* User Info Alert */}
              {user && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="bg-green-100 rounded-full p-2">
                        <User className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-900">Data Auto-filled</p>
                        <p className="text-xs text-green-700 mt-0.5">
                          Nama, email, dan nomor telepon diisi otomatis dari akun: <strong>{user.name}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Data Pemesan */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Data Pemesan
                </h4>
                <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  readOnly={!!user}
                  disabled={!!user}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    user && formData.name === user.name 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300'
                  } ${user ? 'cursor-not-allowed' : ''}`}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  readOnly={!!user}
                  disabled={!!user}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    user && formData.email === user.email 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300'
                  } ${user ? 'cursor-not-allowed' : ''}`}
                  placeholder="contoh@email.com"
                />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor Telepon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    // readOnly={!!user}     // <-- comment sementara
                    // disabled={!!user}     // <-- comment sementara
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      user && formData.phone === user.phone
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}  // <-- hapus cursor-not-allowed
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                </div>
              </div>

              {/* Section 2: Jadwal Reservasi */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Jadwal Reservasi
                </h4>
                <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Reservasi
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-gray-700 rounded-lg cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-gray-700 rounded-lg cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-gray-700 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan Reservasi (Opsional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  placeholder="Tambahkan catatan khusus untuk reservasi Anda..."
                />
              </div>
                </div>
              </div>

              {/* Section 3: Bukti Pembayaran */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  Bukti Pembayaran
                </h4>
                
                <div className="space-y-4">
                  {/* Bank Info */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                    <div className="flex items-start space-x-3 mb-3">
                      <div className="bg-blue-600 rounded-lg p-2">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-blue-900 mb-1">Informasi Rekening Transfer</p>
                        <p className="text-xs text-blue-700">Silakan transfer ke rekening berikut:</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Bank</span>
                        <span className="text-sm font-bold text-gray-900">BCA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">No. Rekening</span>
                        <span className="text-sm font-bold text-gray-900">3450763755</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">Atas Nama</span>
                        <span className="text-sm font-bold text-gray-900">Rafael Nugroho</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-xs font-medium text-gray-600">Jumlah Transfer</span>
                        <span className="text-lg font-bold text-blue-600">{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>
                  </div>

                  {/* Upload File */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Bukti Transfer *
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Format: JPG, PNG, GIF (Maksimal 5MB)
                    </p>
                    {paymentProof && (
                      <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="bg-green-100 rounded-full p-1">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-green-900">
                            File terpilih: {paymentProof.name}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => router.push('/schedule?fieldId=' + fieldId)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    'Reservasi Sekarang'
                  )}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
