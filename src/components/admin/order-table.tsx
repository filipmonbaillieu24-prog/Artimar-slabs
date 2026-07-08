'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Order } from '@/types/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/status-badge'
import {
  Search, ChevronRight, Eye, Calendar, User,
  MapPin, Phone, Package, Check, X, Minus, Truck
} from 'lucide-react'

interface OrderTableProps {
  orders: Order[]
}

type StatusFilter =
  | 'alle'
  | 'doorgestuurd'
  | 'ontvangen'
  | 'voorradig'
  | 'niet-voorradig'
  | 'ingepland'
  | 'deellevering'
  | 'geleverd'

function StockDot({ status }: { status: boolean | null }) {
  if (status === true)
    return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Op voorraad" />
  if (status === false)
    return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Niet voorradig" />
  return <span className="w-2 h-2 rounded-full bg-gray-200 shrink-0" title="Onbekend" />
}

export default function OrderTable({ orders }: OrderTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const klant = order.profiles as any
      const email = klant?.email || ''
      const bedrijf = klant?.bedrijfsnaam || ''
      const orderId = order.id.toUpperCase()
      const referentie = order.referentie || ''

      const matchesSearch =
        email.toLowerCase().includes(search.toLowerCase()) ||
        bedrijf.toLowerCase().includes(search.toLowerCase()) ||
        orderId.includes(search.toUpperCase()) ||
        referentie.toLowerCase().includes(search.toLowerCase())

      let matchesStatus = true
      if (statusFilter === 'doorgestuurd') matchesStatus = order.status === 'bestelling doorgestuurd'
      else if (statusFilter === 'ontvangen') matchesStatus = order.status === 'bestelling ontvangen'
      else if (statusFilter === 'voorradig') matchesStatus = order.status === 'materiaal voorradig'
      else if (statusFilter === 'niet-voorradig') matchesStatus = order.status === 'materiaal niet voorradig'
      else if (statusFilter === 'ingepland') matchesStatus = order.status === 'bestelling ingepland voor levering'
      else if (statusFilter === 'deellevering') matchesStatus = order.status === 'deellevering uitgevoerd'
      else if (statusFilter === 'geleverd') matchesStatus = order.status === 'bestelling geleverd' || order.status === 'nalevering geleverd'

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  const filters: { key: StatusFilter; label: string; activeClass: string; inactiveClass: string }[] = [
    { key: 'alle', label: `Alle (${orders.length})`, activeClass: 'bg-gray-900 text-white', inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
    { key: 'doorgestuurd', label: 'Doorgestuurd', activeClass: 'bg-blue-600 text-white', inactiveClass: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { key: 'ontvangen', label: 'Ontvangen', activeClass: 'bg-slate-700 text-white', inactiveClass: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
    { key: 'voorradig', label: 'Voorradig', activeClass: 'bg-emerald-600 text-white', inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
    { key: 'niet-voorradig', label: 'Niet Voorradig', activeClass: 'bg-amber-600 text-white', inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
    { key: 'ingepland', label: 'Ingepland', activeClass: 'bg-[#D10056] text-white', inactiveClass: 'bg-[#FFF0F5] text-[#D10056] hover:bg-[#FAD0E0]/60' },
    { key: 'deellevering', label: 'Deellevering', activeClass: 'bg-violet-600 text-white', inactiveClass: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
    { key: 'geleverd', label: 'Geleverd', activeClass: 'bg-teal-600 text-white', inactiveClass: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
  ]

  return (
    <div className="space-y-4">
      {/* Search + filter bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoeken op bestelnummer, klant of e-mail..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50/50 focus:outline-none focus:border-[#D10056] focus:ring-1 focus:ring-[#D10056]"
          />
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-3 py-2 rounded-lg transition-colors ${statusFilter === f.key ? f.activeClass : f.inactiveClass}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order cards */}
      <div className="space-y-3">
        {filteredOrders.map((order) => {
          const klant = order.profiles as any
          const items = (order.order_items || []) as any[]

          const totalPlaten = items.reduce((acc: number, i: any) => acc + (i.aantal || 0), 0)
          const inStock = items.filter((i: any) => i.op_voorraad === true && !i.geleverd).length
          const notInStock = items.filter((i: any) => i.op_voorraad === false && !i.geleverd).length
          const delivered = items.filter((i: any) => i.geleverd).length
          const unknown = items.filter((i: any) => i.op_voorraad === null && !i.geleverd).length
          const hasStockInfo = inStock + notInStock + delivered > 0

          // Earliest planned delivery date across in-stock items
          const plannedDates = items
            .filter((i: any) => !i.geleverd && i.op_voorraad === true && i.verwachte_datum)
            .map((i: any) => i.verwachte_datum)
            .sort()
          const earliestDelivery = plannedDates[0] || null

          // Earliest back-order date
          const backorderDates = items
            .filter((i: any) => !i.geleverd && i.op_voorraad === false && i.verwachte_datum)
            .map((i: any) => i.verwachte_datum)
            .sort()
          const earliestBackorder = backorderDates[0] || null

          return (
            <div
              key={order.id}
              className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden hover:border-gray-200 transition-colors"
            >
              {/* Top row */}
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 pt-4 pb-3">

                {/* Order ID + ref */}
                <div className="min-w-[110px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Bestelling</div>
                  <div className="font-mono font-black text-gray-800 text-sm">#{order.id.slice(0, 8).toUpperCase()}</div>
                  {order.referentie && (
                    <div className="text-[10px] text-[#D10056] font-bold mt-0.5">Ref: {order.referentie}</div>
                  )}
                </div>

                {/* Client */}
                <div className="min-w-[160px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Klant
                  </div>
                  <div className="font-bold text-gray-800 text-xs">{klant?.bedrijfsnaam || '—'}</div>
                  <div className="text-[10px] text-gray-400">{klant?.email}</div>
                  {klant?.contactnummer && (
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" /> {klant.contactnummer}
                    </div>
                  )}
                </div>

                {/* Delivery address */}
                {order.levering_adres && (
                  <div className="min-w-[180px] max-w-[220px]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Leveradres
                    </div>
                    <div className="text-xs text-gray-600 font-semibold leading-snug line-clamp-2">
                      {order.levering_adres}
                    </div>
                    {order.levering_methode === 'ophalen' && (
                      <span className="text-[10px] text-blue-500 font-bold">Zelf afhalen</span>
                    )}
                  </div>
                )}

                {/* Dates */}
                <div className="min-w-[130px]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Datums
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500">
                      <span className="font-semibold text-gray-400">Ingediend:</span> {formatDateTime(order.created_at)}
                    </div>
                    {(order.leverdatum || earliestDelivery) && (
                      <div className="text-[10px] flex items-center gap-1 text-emerald-600 font-bold">
                        <Truck className="w-3 h-3" />
                        Levering: {formatDate(order.leverdatum || earliestDelivery)}
                      </div>
                    )}
                    {earliestBackorder && (
                      <div className="text-[10px] text-amber-600 font-semibold">
                        Nalevering v.a.: {formatDate(earliestBackorder)}
                      </div>
                    )}
                    {order.verwachte_datum && !order.leverdatum && (
                      <div className="text-[10px] text-amber-500 font-semibold">
                        Verwacht: {formatDate(order.verwachte_datum)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status + platen count */}
                <div className="ml-auto flex flex-col items-end gap-2">
                  <StatusBadge status={order.status} />
                  <div className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {totalPlaten} platen · {items.length} kleuren
                  </div>
                  <Link
                    href={`/portaal/admin/bestelling/${order.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white text-[10px] font-bold rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Bekijken
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Materials strip */}
              {items.length > 0 && (
                <div className="border-t border-gray-50 px-5 py-3 bg-gray-50/40 flex flex-wrap gap-2 items-center">
                  {items.map((item: any, idx: number) => {
                    const mat = item.materials
                    return (
                      <div
                        key={item.id || idx}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold ${
                          item.geleverd
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                            : item.op_voorraad === true
                            ? 'bg-emerald-50/70 border-emerald-100 text-emerald-800'
                            : item.op_voorraad === false
                            ? 'bg-amber-50 border-amber-100 text-amber-800'
                            : 'bg-white border-gray-100 text-gray-600'
                        }`}
                      >
                        <StockDot status={item.geleverd ? true : item.op_voorraad} />
                        <span className="font-bold">{mat?.kleur || '?'}</span>
                        <span className="text-gray-400">{mat?.dikte_mm}mm</span>
                        <span className="font-extrabold">{item.aantal}×</span>
                        {item.geleverd && <Check className="w-3 h-3 text-emerald-500" />}
                        {item.verwachte_datum && !item.geleverd && (
                          <span className={`font-semibold ${item.op_voorraad === true ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {formatDate(item.verwachte_datum)}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Stock summary */}
                  {hasStockInfo && (
                    <div className="ml-auto flex items-center gap-2 text-[10px] font-bold">
                      {inStock > 0 && <span className="text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3" />{inStock} klaar</span>}
                      {notInStock > 0 && <span className="text-amber-600 flex items-center gap-1"><X className="w-3 h-3" />{notInStock} nalevering</span>}
                      {delivered > 0 && <span className="text-gray-400 flex items-center gap-1"><Package className="w-3 h-3" />{delivered} geleverd</span>}
                      {unknown > 0 && <span className="text-gray-300 flex items-center gap-1"><Minus className="w-3 h-3" />{unknown} onbekend</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filteredOrders.length === 0 && (
          <div className="text-center py-16 text-gray-400 font-medium text-sm bg-white rounded-xl border border-gray-100">
            Geen bestellingen gevonden.
          </div>
        )}
      </div>
    </div>
  )
}
