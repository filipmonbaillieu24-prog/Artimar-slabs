import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/klant/settings-form'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  // Verify auth session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch the profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'klant') {
    redirect('/portaal/admin')
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/portaal/klant"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Terug naar dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Instellingen</h1>
        <p className="text-sm text-gray-400 mt-1">Beheer uw bedrijfsgegevens, adressen en inloggegevens.</p>
      </div>

      <SettingsForm initialProfile={profile} />
    </div>
  )
}
