import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MaterialManager from '@/components/admin/material-manager'
import { ArrowLeft, Database } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MaterialsPage() {
  const supabase = await createClient()

  // Verify auth session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/portaal/klant')
  }

  // Fetch all materials
  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false })

  const initialMaterials = materials || []

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/portaal/admin"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Terug naar bestellingen
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
          <Database className="w-8 h-8 text-[#D10056]" />
          Materialen Catalogus
        </h1>
        <p className="text-sm text-gray-500">
          Beheer de platen (merk, afmetingen, kleur, dikte) die beschikbaar zijn voor partners.
        </p>
      </div>

      {/* Manager interface */}
      <MaterialManager initialMaterials={initialMaterials} />
    </div>
  )
}
