import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrderForm from '@/components/klant/order-form'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function NieuweBestelling() {
  const supabase = await createClient()

  // Verify auth session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch materials catalogue
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .order('merk', { ascending: true })
    .order('kleur', { ascending: true })

  const materialsList = materials || []

  return (
    <div className="space-y-6">
      {/* Back to dashboard breadcrumb */}
      <div>
        <Link
          href="/portaal/klant"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Terug naar dashboard
        </Link>
      </div>

      {/* Header title */}
      <div className="space-y-1">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Nieuwe bestelling invoeren
        </h1>
        <p className="text-sm text-gray-500">
          Configureer uw platenbestelling stap voor stap.
        </p>
      </div>

      {/* Wizard Form */}
      <OrderForm materials={materialsList} />
    </div>
  )
}
