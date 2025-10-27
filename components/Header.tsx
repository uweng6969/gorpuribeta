'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, User, Calendar, MapPin, Settings } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) setUser(JSON.parse(userData))
  }, [])

  /* ---------- NAVIGASI CENTER (DESKTOP) ---------- */
  const NavCenter = () => (
    <div className="hidden md:flex items-center space-x-8">
      <Link href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
        Beranda
      </Link>
      <Link href="/fields" className="text-gray-700 hover:text-primary-600 transition-colors">
        Lapangan
      </Link>
      <Link href="/contact" className="text-gray-700 hover:text-primary-600 transition-colors">
        Kontak
      </Link>
    </div>
  )

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* LOGO */}
          <div className="flex items-center z-10">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">GOR Puri Beta</span>
            </Link>
          </div>

          {/* NAVIGASI TENGAH (absolute) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <NavCenter />
          </div>

          {/* TOMBOL AUTH */}
          <div className="hidden md:flex items-center space-x-4 z-10">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-primary-600 transition-colors"
                >
                  Halo, {user.name}
                </Link>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    setUser(null)
                    window.location.href = '/login'
                  }}
                  className="btn-secondary"
                >
                  Keluar
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-primary-600">
                  Masuk
                </Link>
                <Link href="/register" className="btn-primary">
                  Daftar
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-primary-600 focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation (tetap sama) */}
        {isMenuOpen && (
          <div className="md:hidden px-2 pt-2 pb-3 space-y-1 bg-white border-t">
            <Link href="/" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
              Beranda
            </Link>
            <Link href="/fields" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
              Lapangan
            </Link>
            <Link href="/contact" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
              Kontak
            </Link>
            {/* auth tetap */}
            <div className="border-t pt-3 mt-3">
              {user ? (
                <>
                  <Link href="/dashboard" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    Halo, {user.name}
                  </Link>
                  <button
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      setUser(null)
                      setIsMenuOpen(false)
                      window.location.href = '/login'
                    }}
                    className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    Masuk
                  </Link>
                  <Link href="/register" className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md">
                    Daftar
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}