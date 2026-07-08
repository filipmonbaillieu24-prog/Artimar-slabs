'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, User, ShieldAlert } from 'lucide-react'

export default function Navbar() {
  const router = useRouter()
  const supabase = createClient()
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; role: string } | null>(null)

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, role, bedrijfsnaam')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserProfile({
            email: profile.email,
            name: profile.bedrijfsnaam || profile.email.split('@')[0],
            role: profile.role,
          })
        }
      }
    }
    fetchUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 py-3.5 px-6 flex items-center justify-between shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        {/* SVG stylized Artimar logo box */}
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#D10056] rounded-md flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 100 100" className="w-7 h-7 text-white fill-current">
              {/* Stylized 'a' loop */}
              <path d="M75,55 C75,65 65,75 50,75 C30,75 25,58 25,48 C25,32 38,25 50,25 C62,25 70,30 72,40 L73,43 C70,33 60,30 50,30 C35,30 31,42 31,48 C31,55 35,68 50,68 C62,68 68,60 69,53 L75,55 Z" />
              <path d="M68,48 L74,48 L74,75 L68,75 L68,48 Z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight text-[#111] leading-none uppercase">
              artimar
            </span>
            <span className="text-[7.5px] font-semibold text-gray-400 tracking-[0.16em] leading-none mt-1">
              PASSION FOR STONE
            </span>
          </div>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {userProfile && (
          <>
            {/* User details badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700">
              {userProfile.role === 'admin' ? (
                <ShieldAlert className="w-4 h-4 text-[#D10056]" />
              ) : (
                <User className="w-4 h-4 text-gray-400" />
              )}
              <span className="font-semibold text-gray-800">
                {userProfile.name}
              </span>
              <span className="text-[10px] bg-gray-200/80 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase tracking-wider">
                {userProfile.role === 'admin' ? 'Beheer' : 'Partner'}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:text-[#D10056] hover:bg-red-50 hover:border-red-100 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden xs:inline">Uitloggen</span>
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
