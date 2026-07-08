'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Order } from '@/types/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import StatusBadge from '@/components/shared/status-badge'
import { Search, ChevronRight, Eye, Calendar, User, ShoppingBag } from 'lucide-react'

interface OrderTableProps {
  orders: Order[]
}

type StatusFilter = 'alle' | 'doorgestuurd' | 'ontvangen' | 'voorradig' | 'niet-voorradig' | 'ingepland'

export default function OrderTable({ orders }: OrderTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle')

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const klant = order.profiles
      const email = klant?.email || ''
      const bedrijf = klant?.bedrijfsnaam || ''
      const orderId = order.id.toUpperCase()
      
      const matchesSearch = 
        email.toLowerCase().includes(search.toLowerCase()) ||
        bedrijf.toLowerCase().includes(search.toLowerCase()) ||
        orderId.includes(search.toUpperCase())

      let matchesStatus = true
      if (statusFilter === 'doorgestuurd') {
        matchesStatus = order.status === 'bestelling doorgestuurd'
      } else if (statusFilter === 'ontvangen') {
        matchesStatus = order.status === 'bestelling ontvangen'
      } else if (statusFilter === 'voorradig') {
        matchesStatus = order.status === 'materiaal voorradig'
      } else if (statusFilter === 'niet-voorradig') {
        matchesStatus = order.status === 'materiaal niet voorradig'
      } else if (statusFilter === 'ingepland') {
        matchesStatus = order.status === 'bestelling ingepland voor levering'
      }

      return matchesSearch && matchesStatus
    })
  }, [orders, search, statusFilter])

  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        {/* Search */}
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

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button
            onClick={() => setStatusFilter('alle')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              statusFilter === 'alle'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Alle ({orders.length})
          </button>
          <button
            onClick={() => setStatusFilter('doorgestuurd')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              statusFilter === 'doorgestuurd'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Doorgestuurd
          </button>
          <button
            onClick={() => setStatusFilter('ontvangen')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              statusFilter === 'ontvangen'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Ontvangen
          </button>
          <button
            onClick={() => setStatusFilter('voorradig')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              statusFilter === 'voorradig'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            Voorradig
          </button>
          <button
            onClick={() => setStatusFilter('niet-voorradig')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              statusFilter === 'niet-voorradig'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            Niet Voorradig
          </button>
          <button
            onClick={() => setStatusFilter('ingepland')}
            className={`px-3.5 py-2 rounded-lg transition-colors ${
              statusFilter === 'ingepland'
                ? 'bg-[#D10056] text-white'
                : 'bg-[#FFF0F5] text-[#D10056] hover:bg-[#FAD0E0]/60'
            }`}
          >
            Ingepland
          </button>
        </div>
      </div>

      {/* Orders Table list */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="py-3.5 px-6">Bestelnummer</th>
                <th className="py-3.5 px-6">Klant Info</th>
                <th className="py-3.5 px-6">Indiendatum</th>
                <th className="py-3.5 px-6 text-center">Platen</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredOrders.map((order) => {
                const klant = order.profiles
                const itemsCount = order.order_items?.reduce((acc, item) => acc + item.aantal, 0) || 0
                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-gray-800">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-gray-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {klant?.bedrijfsnaam || 'Klant'}
                        </span>
                        <span className="text-gray-400 text-[10px]">{klant?.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateTime(order.created_at)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center bg-gray-100 text-gray-800 font-extrabold w-6 h-6 rounded-full">
                        {itemsCount}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/portaal/admin/bestelling/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-black text-white text-[10px] font-bold rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Bekijken
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                )
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400 font-medium">
                    Geen bestellingen gevonden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
