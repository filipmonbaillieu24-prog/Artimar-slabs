import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/shared/status-badge'
import StatusUpdater from '@/components/admin/status-updater'
import AuditTrail from '@/components/admin/audit-trail'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ArrowLeft, User, Calendar, MessageSquare, List, Download } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
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

  // Fetch the order
  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      profiles (
        email,
        bedrijfsnaam
      ),
      order_items (
        *,
        materials (*)
      )
    `)
    .eq('id', id)
    .single()

  if (!order) {
    notFound()
  }

  // Fetch status history / audit trail
  const { data: history } = await supabase
    .from('order_status_history')
    .select(`
      *,
      profiles (
        email,
        bedrijfsnaam
      )
    `)
    .eq('order_id', id)
    .order('changed_at', { ascending: false })

  const typedHistory = history || []
  const client = order.profiles
  const isDeliveryScheduled = order.status === 'bestelling ingepland voor levering'

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/portaal/admin"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Terug naar bestellingen
        </Link>

        {isDeliveryScheduled && (
          <a
            href={`/api/pdf/leverbon?orderId=${order.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-[#D10056] hover:bg-[#B00047] text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-[#D10056]/10"
          >
            <Download className="w-3.5 h-3.5" />
            Leverbon PDF Downloaden
          </a>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Bestelling #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500">
            Ingediend op {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Col - Order contents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client profile info */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-50 pb-3">
              <User className="w-4 h-4" />
              Klant Gegevens
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <span className="text-gray-400 block font-medium">Bedrijfsnaam:</span>
                <span className="text-gray-800 font-bold mt-0.5 block">{client?.bedrijfsnaam || 'Klant'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">E-mailadres:</span>
                <span className="text-gray-800 font-bold mt-0.5 block">{client?.email}</span>
              </div>
            </div>
          </div>

          {/* Dates & Remarks */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-50 pb-3">
              <Calendar className="w-4 h-4" />
              Planningsdata & Opmerkingen
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <span className="text-gray-400 block font-medium">Verwachte datum:</span>
                <span className="text-gray-800 font-bold mt-0.5 block">
                  {formatDate(order.verwachte_datum)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block font-medium">Definitieve leverdatum:</span>
                <span className="text-[#D10056] font-bold mt-0.5 block">
                  {formatDate(order.leverdatum)}
                </span>
              </div>
              
              {order.opmerkingen && (
                <div className="sm:col-span-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100/50">
                  <span className="text-gray-400 font-medium flex items-center gap-1 mb-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-300" />
                    Opmerkingen van de partner:
                  </span>
                  <p className="text-gray-700 italic leading-relaxed whitespace-pre-wrap font-medium">
                    {order.opmerkingen}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Slabs ordered list table */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 border-b border-gray-50 pb-3">
              <List className="w-4 h-4" />
              Gekozen Platen ({order.order_items?.length || 0})
            </h3>
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Merk & Code</th>
                    <th className="py-2.5 px-4">Kleur & Afwerking</th>
                    <th className="py-2.5 px-4">Dikte</th>
                    <th className="py-2.5 px-4">Afmetingen</th>
                    <th className="py-2.5 px-4 text-right">Aantal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {order.order_items?.map((item: any) => {
                    const mat = item.materials
                    return (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-bold text-gray-800">
                          {mat ? `${mat.merk} - ${mat.code}` : 'Onbekend'}
                        </td>
                        <td className="py-3 px-4">
                          {mat ? `${mat.kleur} (${mat.afwerking})` : 'Onbekend'}
                        </td>
                        <td className="py-3 px-4">{mat ? `${mat.dikte_mm} mm` : '-'}</td>
                        <td className="py-3 px-4">{item.lengte_mm} x {item.breedte_mm} mm</td>
                        <td className="py-3 px-4 text-right font-extrabold text-gray-850">
                          {item.aantal} st.
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col - Updates & History */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status updater */}
          <StatusUpdater order={order} />

          {/* Audit trail */}
          <AuditTrail history={typedHistory} />
        </div>
      </div>
    </div>
  )
}
