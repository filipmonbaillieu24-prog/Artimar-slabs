import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrderList from '@/components/klant/order-list'
import { Plus, SlidersHorizontal, PackageOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function KlantDashboard() {
  const supabase = await createClient()

  // Get user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Get client's orders
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        materials (*)
      )
    `)
    .eq('klant_id', user.id)
    .order('created_at', { ascending: false })

  const typedOrders = orders || []

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#D10056] font-bold text-xs uppercase tracking-widest">
            <PackageOpen className="w-4 h-4" />
            Partner Portaal
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Partner Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Welkom, <span className="font-semibold text-gray-800">{profile.bedrijfsnaam || 'Partner'}</span> - {profile.email}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/portaal/klant/nieuw"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] text-white font-bold rounded-lg text-sm transition-all shadow-md shadow-[#D10056]/10"
          >
            <Plus className="w-4 h-4" />
            Nieuwe bestelling
          </Link>
          <button
            disabled
            className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-gray-400 bg-gray-50/50 font-bold rounded-lg text-sm cursor-not-allowed"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Nieuwe uitgebreide offerte
          </button>
        </div>
      </div>

      {/* Tabs visual (simulated based on mockup) */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8 -mb-px">
          <button className="py-4 border-b-2 border-[#D10056] text-[#D10056] font-bold text-sm">
            Bestellingen ({typedOrders.length})
          </button>
          <button className="py-4 border-b-2 border-transparent text-gray-400 font-semibold text-sm hover:text-gray-600 cursor-not-allowed">
            Concepten (0)
          </button>
          <button className="py-4 border-b-2 border-transparent text-gray-400 font-semibold text-sm hover:text-gray-600 cursor-not-allowed">
            Offertes (0)
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">
          Uw bestelde platen
        </div>
        <OrderList initialOrders={typedOrders} />
      </div>
    </div>
  )
}
