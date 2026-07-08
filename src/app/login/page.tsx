'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, ArrowLeft, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        const msg = signInError.message
        if (msg === 'Invalid login credentials' || signInError.status === 400) {
          setError('Ongeldig e-mailadres of wachtwoord.')
        } else if (!msg || msg === '{}') {
          setError('Inloggen mislukt. Controleer uw internetverbinding of database.')
        } else {
          setError(msg)
        }
        setLoading(false)
        return
      }

      // Check user role to redirect
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Kan uw profielrol niet ophalen. Neem contact op met Artimar.')
        setLoading(false)
        return
      }

      router.refresh()
      if (profile.role === 'admin') {
        router.push('/portaal/admin')
      } else {
        router.push('/portaal/klant')
      }
    } catch (err: any) {
      setError('Er is een onverwachte fout opgetreden.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAFAFA] text-[#111111]">
      {/* Header Link */}
      <div className="p-6">
        <a
          href="https://artimar.be"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Terug naar home
        </a>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[460px] bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center">
          {/* Circular Icon */}
          <div className="w-14 h-14 bg-[#FFF0F5] rounded-full flex items-center justify-center mb-6">
            <Briefcase className="w-6 h-6 text-[#D10056]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#111] text-center mb-1">
            Partner Portaal
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            Log in om uw bestellingen te beheren.
          </p>

          <form onSubmit={handleLogin} className="w-full space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg text-center">
                {error}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Zakelijk E-mailadres
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ben@artimar.be"
                className="w-full artimar-input"
                disabled={loading}
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Wachtwoord
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••"
                className="w-full artimar-input"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] text-white font-semibold rounded-lg text-sm transition-all duration-200 shadow-md shadow-[#D10056]/15 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Bezig met inloggen...
                </>
              ) : (
                'Inloggen als Partner'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer copyright space */}
      <div className="p-6 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Artimar. Alle rechten voorbehouden.
      </div>
    </div>
  )
}
