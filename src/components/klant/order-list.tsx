'use client'

import { useState } from 'react'
import { Order, OrderItem } from '@/types/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/status-badge'
import { Download, FileText, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'

interface OrderListProps {
  initialOrders: Order[]
}

export default function OrderList({ initialOrders }: OrderListProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

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

  return (
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
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-500">
                    Bestelling #{order.id.slice(0, 8).toUpperCase()}
                  </span>
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
              </div>
            </div>

            {/* Expandable items section */}
            {isExpanded && (
              <div className="border-t border-gray-50 bg-gray-50/50 p-5 space-y-4">
                {/* Specific Dates Details */}
                {(order.verwachte_datum || order.leverdatum || order.opmerkingen) && (
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
                    {order.opmerkingen && (
                      <div className="md:col-span-3">
                        <span className="text-gray-400 block font-medium">Opmerkingen klant:</span>
                        <p className="text-gray-600 mt-1 italic whitespace-pre-wrap">
                          {order.opmerkingen}
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                            <td className="py-3 px-4">
                              {item.lengte_mm} x {item.breedte_mm} mm
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
  )
}
