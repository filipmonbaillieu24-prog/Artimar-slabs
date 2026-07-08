'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem } from '@/types/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/status-badge'
import { Download, FileText, ChevronDown, ChevronUp, AlertCircle, Trash2 } from 'lucide-react'

interface OrderListProps {
  initialOrders: Order[]
}

export default function OrderList({ initialOrders }: OrderListProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('pipeline')

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Weet u zeker dat u deze bestelling wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)

      if (error) throw error

      setOrders(prev => prev.filter(o => o.id !== orderId))
      router.refresh()
    } catch (err: any) {
      alert(`Fout bij het verwijderen van de bestelling: ${err.message || err}`)
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  const handleDownloadPDF = (orderId: string) => {
    // Navigate to API endpoint which returns the PDF file directly
    window.open(`/api/pdf/leverbon?orderId=${orderId}`, '_blank')
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-700 mb-1">Geen bestellingen gevonden</h3>
        <p className="text-gray-400 text-sm">U heeft nog geen platenbestellingen geplaatst.</p>
      </div>
    )
  }

  // Column definitions for the Pipeline
  const pipelineColumns = [
    {
      id: 'bestelling doorgestuurd',
      title: 'Doorgestuurd',
      bgClass: 'bg-blue-50/30 border-blue-100/50',
      textClass: 'text-blue-700',
      dotClass: 'bg-blue-500',
    },
    {
      id: 'bestelling ontvangen',
      title: 'Ontvangen',
      bgClass: 'bg-purple-50/30 border-purple-100/50',
      textClass: 'text-purple-700',
      dotClass: 'bg-purple-500',
    },
    {
      id: 'materiaal niet voorradig',
      title: 'Niet Voorradig',
      bgClass: 'bg-amber-50/30 border-amber-100/50',
      textClass: 'text-amber-750',
      dotClass: 'bg-amber-500',
    },
    {
      id: 'materiaal voorradig',
      title: 'Voorradig',
      bgClass: 'bg-emerald-50/30 border-emerald-100/50',
      textClass: 'text-emerald-700',
      dotClass: 'bg-emerald-500',
    },
    {
      id: 'bestelling ingepland voor levering',
      title: 'Ingepland',
      bgClass: 'bg-pink-50/30 border-pink-100/50',
      textClass: 'text-pink-700',
      dotClass: 'bg-[#D10056]',
    },
  ]

  const getOrdersByStatus = (statusId: string) => {
    return orders.filter(o => o.status === statusId)
  }

  return (
    <div className="space-y-6">
      {/* Segmented View Switcher */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-150/70 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
          UW BESTELDE PLATEN ({orders.length})
        </h3>
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-250/80">
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all duration-200 ${
              viewMode === 'pipeline'
                ? 'bg-white text-gray-900 shadow-sm border-gray-200'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Pipeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-xs font-extrabold rounded-md transition-all duration-200 ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm border-gray-200'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Lijst
          </button>
        </div>
      </div>

      {viewMode === 'pipeline' ? (
        /* KANBAN PIPELINE VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 w-full select-none">
          {pipelineColumns.map((col) => {
            const colOrders = getOrdersByStatus(col.id)
            return (
              <div
                key={col.id}
                className="flex flex-col gap-2.5 rounded-2xl border border-gray-100 bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.01)] w-full"
              >
                {/* Column header */}
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${col.dotClass}`} />
                    <h4 className="font-extrabold text-[10px] text-gray-800 uppercase tracking-wider">{col.title}</h4>
                  </div>
                  <span className="text-[10px] bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-full font-bold text-gray-500">
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                  {colOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-[10px] font-semibold italic">
                      Geen bestellingen
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const itemCount = order.order_items?.reduce((acc, item) => acc + item.aantal, 0) || 0
                      const isExpanded = expandedOrder === order.id
                      const isDeliveryScheduled = order.status === 'bestelling ingepland voor levering'

                      return (
                        <div
                          key={order.id}
                          className="bg-white border border-gray-100 rounded-xl p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.035)] transition-all space-y-2.5"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-black text-gray-800 shrink-0 bg-gray-100 px-1.5 py-0.5 rounded">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            {order.referentie && (
                              <span className="text-[9px] bg-pink-50/20 text-[#D10056] font-bold px-1.5 py-0.5 rounded border border-[#FAD0E0]/35 truncate flex-1 text-right max-w-[100px]" title={order.referentie}>
                                Ref: {order.referentie}
                              </span>
                            )}
                          </div>

                          <div className="text-[9px] text-gray-450 space-y-1.5 font-semibold leading-tight">
                            <div>Gemaakt: {formatDate(order.created_at)}</div>
                            
                            {/* Date Badges for High Visibility */}
                            <div className="flex flex-col gap-1 pt-0.5">
                              {order.verwachte_datum && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-100/50 font-extrabold w-full">
                                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                                  <span>Verwacht: {formatDate(order.verwachte_datum)}</span>
                                </div>
                              )}
                              {order.leverdatum && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-pink-50 text-[#D10056] border border-[#FAD0E0]/30 font-black w-full">
                                  <span className="w-1 h-1 rounded-full bg-[#D10056] shrink-0" />
                                  <span>Levering: {formatDate(order.leverdatum)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Detailed item specs list */}
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {order.order_items.map((item: any) => {
                                const mat = item.materials
                                return (
                                  <div key={item.id} className="bg-gray-50/70 p-2 rounded-lg border border-gray-100 flex flex-col gap-1 text-[10px] leading-tight">
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="font-extrabold text-gray-800 truncate flex-1" title={mat?.kleur}>
                                        {mat ? `${mat.kleur} (${mat.code})` : 'Onbekend'}
                                      </span>
                                      <span className="text-[#D10056] font-black shrink-0 text-[11px]">
                                        {item.aantal} st.
                                      </span>
                                    </div>
                                    {mat && (
                                      <div className="text-[9px] text-gray-500 font-semibold flex flex-wrap gap-x-1.5 gap-y-0.5 items-center leading-none mt-0.5">
                                        <span>{mat.merk}</span>
                                        <span className="text-gray-300">•</span>
                                        <span>{mat.dikte_mm}mm</span>
                                        <span className="text-gray-300">•</span>
                                        <span className="truncate">{mat.afwerking}</span>
                                      </div>
                                    )}
                                    <div className="text-[9px] text-gray-400 font-bold leading-none mt-0.5">
                                      {item.lengte_mm && item.breedte_mm
                                        ? `${item.lengte_mm} x ${item.breedte_mm} mm`
                                        : 'Volledige plaat'
                                      }
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Action panel */}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-50 gap-2">
                            <div className="flex gap-1">
                              {isDeliveryScheduled && (
                                <button
                                  type="button"
                                  onClick={() => handleDownloadPDF(order.id)}
                                  className="p-1.5 bg-[#D10056]/10 hover:bg-[#D10056]/20 text-[#D10056] rounded-md transition-colors"
                                  title="Download Leverbon"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1.5 hover:bg-red-50 text-red-500 rounded-md transition-colors"
                                title="Verwijderen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => toggleExpand(order.id)}
                              className="text-[9px] font-bold text-gray-500 hover:text-gray-900 flex items-center gap-0.5"
                            >
                              {isExpanded ? 'Verberg' : 'Details'}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {/* Details drawer inside card */}
                          {isExpanded && (
                            <div className="border-t border-gray-50 pt-2.5 space-y-2 text-[10px] animate-fadeIn">
                              <div>
                                <span className="text-gray-400 font-bold block">Adres:</span>
                                <span className="text-gray-700 font-semibold mt-0.5 block leading-tight break-words">
                                  {order.levering_adres || 'Niet opgegeven'}
                                </span>
                              </div>
                              {order.opmerkingen && (
                                <div>
                                  <span className="text-gray-400 font-bold block">Opmerking:</span>
                                  <p className="text-gray-600 font-medium italic mt-0.5 leading-tight">
                                    {order.opmerkingen}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* STANDARD LIST VIEW */
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedOrder === order.id
            const itemCount = order.order_items?.reduce((acc, item) => acc + item.aantal, 0) || 0
            const isDeliveryScheduled = order.status === 'bestelling ingepland voor levering'

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-all overflow-hidden"
              >
                {/* Header info */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-bold text-gray-800">
                        Bestelling #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      {order.referentie && (
                        <span className="text-xs bg-gray-50 text-gray-600 font-bold px-2 py-0.5 rounded border border-gray-200">
                          Ref: {order.referentie}
                        </span>
                      )}
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="text-xs text-gray-400">
                      Geplaatst op: {formatDateTime(order.created_at)}
                    </div>
                  </div>

                  {/* Action area */}
                  <div className="flex items-center gap-3">
                    {isDeliveryScheduled && (
                      <button
                        onClick={() => handleDownloadPDF(order.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-[#D10056] hover:bg-[#B00047] text-white text-xs font-bold rounded-lg transition-colors shadow-sm shadow-[#D10056]/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Leverbon PDF
                      </button>
                    )}

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-900 text-xs font-semibold rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          Verberg details
                          <ChevronUp className="w-3.5 h-3.5" />
                        </>
                      ) : (
                        <>
                          Toon platen ({itemCount})
                          <ChevronDown className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 hover:border-red-300 text-red-650 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Verwijderen
                    </button>
                  </div>
                </div>

                {/* Expandable items section */}
                {isExpanded && (
                  <div className="border-t border-gray-50 bg-gray-50/50 p-5 space-y-4">
                    {/* Specific Dates & Delivery Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-100 text-xs mb-2">
                      {order.verwachte_datum && (
                        <div>
                          <span className="text-gray-400 block font-medium">Verwachte datum:</span>
                          <span className="font-bold text-gray-700 mt-0.5 block">
                            {formatDate(order.verwachte_datum)}
                          </span>
                        </div>
                      )}
                      {order.leverdatum && (
                        <div>
                          <span className="text-gray-400 block font-medium">Leverdatum:</span>
                          <span className="font-bold text-gray-700 mt-0.5 block">
                            {formatDate(order.leverdatum)}
                          </span>
                        </div>
                      )}
                      {order.levering_methode && (
                        <div>
                          <span className="text-gray-400 block font-medium">Levering / Afhaling:</span>
                          <span className="font-bold text-gray-700 mt-0.5 block">
                            {order.levering_methode === 'standaard' && 'Standaard Partneradres'}
                            {order.levering_methode === 'ander' && 'Afwijkend Leveringsadres'}
                            {order.levering_methode === 'ophalen' && 'Zelf afhalen (Magazijn)'}
                          </span>
                        </div>
                      )}
                      {order.levering_methode === 'ander' && order.levering_adres && (
                        <div className="md:col-span-3 border-t border-gray-50 pt-2">
                          <span className="text-gray-400 block font-medium">Leveringsadres:</span>
                          <span className="font-bold text-gray-700 mt-0.5 block">
                            {order.levering_adres}
                          </span>
                        </div>
                      )}
                      {order.opmerkingen && (
                        <div className="md:col-span-3 border-t border-gray-50 pt-2">
                          <span className="text-gray-400 block font-medium">Opmerkingen klant:</span>
                          <p className="text-gray-600 mt-1 italic whitespace-pre-wrap">
                            {order.opmerkingen}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Table of items */}
                    <div className="overflow-x-auto bg-white border border-gray-100 rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 text-gray-400 uppercase tracking-wider font-bold border-b border-gray-100">
                            <th className="py-3 px-4">Merk & Code</th>
                            <th className="py-3 px-4">Kleur & Afwerking</th>
                            <th className="py-3 px-4">Dikte</th>
                            <th className="py-3 px-4">Afmetingen (L x B)</th>
                            <th className="py-3 px-4 text-right">Aantal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-700">
                          {order.order_items?.map((item: any) => {
                            const mat = item.materials
                            return (
                              <tr key={item.id} className="hover:bg-gray-50/50">
                                <td className="py-3 px-4 font-semibold">
                                  {mat ? `${mat.merk} - ${mat.code}` : 'Onbekend'}
                                </td>
                                <td className="py-3 px-4">
                                  {mat ? `${mat.kleur} (${mat.afwerking})` : 'Onbekend'}
                                </td>
                                <td className="py-3 px-4 font-medium">
                                  {mat ? `${mat.dikte_mm} mm` : '-'}
                                </td>
                                <td className="py-3 px-4 font-medium text-gray-500">
                                  {item.lengte_mm && item.breedte_mm 
                                    ? `${item.lengte_mm} x ${item.breedte_mm} mm` 
                                    : 'Volledige plaat'
                                  }
                                </td>
                                <td className="py-3 px-4 text-right font-bold">
                                  {item.aantal} st.
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
