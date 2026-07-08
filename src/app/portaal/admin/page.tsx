import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrderTable from '@/components/admin/order-table'
import { LayoutGrid, ClipboardList, Database, Boxes } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Verify session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify profile and admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/portaal/klant')
  }

  // Fetch all orders with customer details
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (
        email,
        bedrijfsnaam,
        contactnummer
      ),
      order_items (
        id,
        aantal,
        op_voorraad,
        geleverd,
        verwachte_datum,
        materials (
          kleur,
          merk,
          code,
          afwerking,
          dikte_mm
        )
      )
    `)
    .order('created_at', { ascending: false })

  const allOrders = orders || []

  // Count status stats
  const total = allOrders.length
  const doorgestuurd = allOrders.filter(o => o.status === 'bestelling doorgestuurd').length
  const ontvangen = allOrders.filter(o => o.status === 'bestelling ontvangen').length
  const nietVoorradig = allOrders.filter(o => o.status === 'materiaal niet voorradig').length
  const ingepland = allOrders.filter(o => o.status === 'bestelling ingepland voor levering').length

  return (
    <div className="space-y-8">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[#D10056] font-bold text-xs uppercase tracking-widest">
            <ClipboardList className="w-4 h-4" />
            Artimar Beheer
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Bestellingen Portaal
          </h1>
          <p className="text-sm text-gray-500">
            Overzicht en beheer van alle ingekomen partner bestellingen.
          </p>
        </div>

        {/* Action button */}
        <div>
          <Link
            href="/portaal/admin/materialen"
            className="inline-flex items-center gap-2 px-5 py-3 bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] text-white font-bold rounded-lg text-sm transition-all shadow-md shadow-[#D10056]/10"
          >
            <Database className="w-4 h-4" />
            Materialen Beheren
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Totaal</span>
          <span className="text-2xl font-black text-gray-800 mt-2">{total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Doorgestuurd</span>
          <span className="text-2xl font-black text-blue-600 mt-2">{doorgestuurd}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ontvangen</span>
          <span className="text-2xl font-black text-slate-700 mt-2">{ontvangen}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Niet Voorradig</span>
          <span className="text-2xl font-black text-amber-600 mt-2">{nietVoorradig}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between md:col-span-1 col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#D10056]">Ingepland</span>
          <span className="text-2xl font-black text-[#D10056] mt-2">{ingepland}</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="space-y-4">
        <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Boxes className="w-4 h-4 text-gray-400" />
          Binnengekomen Bestellingen
        </div>
        <OrderTable orders={allOrders} />
      </div>
    </div>
  )
}
