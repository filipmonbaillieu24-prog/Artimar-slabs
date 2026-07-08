'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrderItem, OrderStatus } from '@/types/database.types'
import {
  Check, X, Minus, PackageCheck, PackagePlus,
  Loader2, AlertCircle, CalendarClock, RotateCcw, Truck
} from 'lucide-react'

interface StockManagerProps {
  orderId: string
  initialItems: OrderItem[]
  orderStatus: OrderStatus
}

type StockState = 'unknown' | 'in_stock' | 'not_in_stock'

function getStockState(op_voorraad: boolean | null): StockState {
  if (op_voorraad === true) return 'in_stock'
  if (op_voorraad === false) return 'not_in_stock'
  return 'unknown'
}

export default function StockManager({ orderId, initialItems, orderStatus }: StockManagerProps) {
  const router = useRouter()
  const supabase = createClient()

  const [items, setItems] = useState<OrderItem[]>(initialItems)
  const [saving, setSaving] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const pendingItems = items.filter(i => !i.geleverd)
  const inStockPending = pendingItems.filter(i => i.op_voorraad === true)
  const notInStockPending = pendingItems.filter(i => i.op_voorraad === false)
  const deliveredItems = items.filter(i => i.geleverd)

  const canPlanDelivery = inStockPending.length > 0
  const canConfirmDelivery = inStockPending.length > 0
  const isPartial = inStockPending.length > 0 && notInStockPending.length > 0

  // ─── Stock toggle ────────────────────────────────────────────
  const handleToggleStock = async (item: OrderItem, newState: StockState) => {
    const newVal = newState === 'in_stock' ? true : newState === 'not_in_stock' ? false : null
    setSaving(item.id)
    setError(null)
    setSuccessMsg(null)

    const updated = items.map(i => i.id === item.id ? { ...i, op_voorraad: newVal } : i)
    setItems(updated)

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ op_voorraad: newVal })
      .eq('id', item.id)

    if (updateError) {
      setItems(items)
      setError(`Fout bij opslaan: ${updateError.message}`)
    }
    setSaving(null)
  }

  // ─── Per-item date ───────────────────────────────────────────
  const handleItemDateChange = async (item: OrderItem, date: string) => {
    const updated = items.map(i => i.id === item.id ? { ...i, verwachte_datum: date || null } : i)
    setItems(updated)

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ verwachte_datum: date || null })
      .eq('id', item.id)

    if (updateError) {
      setError(`Fout bij opslaan datum: ${updateError.message}`)
    }
  }

  // ─── Plan delivery (save dates, update status — no geleverd yet) ──
  const handlePlanDelivery = async () => {
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd.')

      const newStatus: OrderStatus = 'bestelling ingepland voor levering'

      // Set leverdatum on order from the first in-stock item's planned date (if set)
      const firstDate = inStockPending.find(i => i.verwachte_datum)?.verwachte_datum || null

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          leverdatum: firstDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (orderError) throw new Error(orderError.message)

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        changed_by: user.id,
        old_status: orderStatus,
        new_status: newStatus,
        metadata: {
          actie: 'levering ingepland',
          items_op_voorraad: inStockPending.length,
          items_nalevering: notInStockPending.length
        }
      })

      setSuccessMsg(`Levering ingepland voor ${inStockPending.length} item(s).${notInStockPending.length > 0 ? ` ${notInStockPending.length} item(s) in nalevering.` : ''}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Onbekende fout.')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Confirm delivery (geleverd = true for in-stock items) ───
  const handleConfirmDelivery = async () => {
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd.')

      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ geleverd: true })
        .in('id', inStockPending.map(i => i.id))

      if (itemsError) throw new Error(itemsError.message)

      const allWillBeDelivered = notInStockPending.length === 0
      const newStatus: OrderStatus = allWillBeDelivered ? 'bestelling geleverd' : 'deellevering uitgevoerd'

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (orderError) throw new Error(orderError.message)

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        changed_by: user.id,
        old_status: orderStatus,
        new_status: newStatus,
        metadata: {
          actie: allWillBeDelivered ? 'volledige levering bevestigd' : 'deellevering bevestigd',
          geleverd_items: inStockPending.length
        }
      })

      setSuccessMsg(`Levering bevestigd voor ${inStockPending.length} item(s).`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Onbekende fout.')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Undo delivery (reset geleverd = false) ──────────────────
  const handleUndoDelivery = async (item: OrderItem) => {
    setSaving(item.id)
    setError(null)
    setSuccessMsg(null)

    const updated = items.map(i => i.id === item.id ? { ...i, geleverd: false } : i)
    setItems(updated)

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ geleverd: false })
      .eq('id', item.id)

    if (updateError) {
      setItems(items)
      setError(`Fout bij ongedaan maken: ${updateError.message}`)
    } else {
      // Also roll back order status if all items were delivered
      if (deliveredItems.length === items.length) {
        await supabase
          .from('orders')
          .update({ status: 'bestelling ingepland voor levering', updated_at: new Date().toISOString() })
          .eq('id', orderId)
        router.refresh()
      }
    }
    setSaving(null)
  }

  return (
    <div className="space-y-5">

      {/* Feedback */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-100 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold uppercase tracking-wider">
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
          <div className="text-2xl font-black text-emerald-600">{inStockPending.length}</div>
          <div className="text-emerald-600 mt-0.5">Op voorraad</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
          <div className="text-2xl font-black text-amber-600">{notInStockPending.length}</div>
          <div className="text-amber-600 mt-0.5">Nalevering</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2.5">
          <div className="text-2xl font-black text-gray-500">{deliveredItems.length}</div>
          <div className="text-gray-500 mt-0.5">Geleverd</div>
        </div>
      </div>

      {/* Items table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
              <th className="py-2.5 px-4">Materiaal</th>
              <th className="py-2.5 px-4 text-center">Aantal</th>
              <th className="py-2.5 px-4 text-center">Voorraad</th>
              <th className="py-2.5 px-4">
                <span className="flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Datum
                </span>
              </th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const mat = item.materials as any
              const stockState = getStockState(item.op_voorraad)
              const isSaving = saving === item.id
              const isNotInStock = stockState === 'not_in_stock'
              const isInStock = stockState === 'in_stock'

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    item.geleverd
                      ? 'bg-emerald-50/40'
                      : isNotInStock
                      ? 'bg-amber-50/30'
                      : isInStock
                      ? 'bg-emerald-50/20'
                      : 'bg-white'
                  }`}
                >
                  {/* Material */}
                  <td className={`py-3 px-4 ${item.geleverd ? 'opacity-60' : ''}`}>
                    <div className="font-bold text-gray-800">{mat?.kleur || 'Onbekend'}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {mat ? `${mat.merk} · ${mat.code} · ${mat.dikte_mm}mm · ${mat.afwerking}` : ''}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className={`py-3 px-4 text-center font-extrabold text-gray-700 ${item.geleverd ? 'opacity-60' : ''}`}>
                    {item.aantal} st.
                  </td>

                  {/* Stock toggle */}
                  <td className="py-3 px-4">
                    {item.geleverd ? (
                      <div className="flex justify-center">
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Geleverd
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          disabled={isSaving || actionLoading}
                          onClick={() => handleToggleStock(item, stockState === 'not_in_stock' ? 'unknown' : 'not_in_stock')}
                          title="Niet voorradig"
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border ${
                            stockState === 'not_in_stock'
                              ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                              : 'border-gray-200 text-gray-300 hover:border-amber-300 hover:text-amber-400'
                          } disabled:opacity-40`}
                        >
                          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || actionLoading}
                          onClick={() => handleToggleStock(item, 'unknown')}
                          title="Onbekend"
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border ${
                            stockState === 'unknown'
                              ? 'bg-gray-400 border-gray-400 text-white shadow-sm'
                              : 'border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-400'
                          } disabled:opacity-40`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || actionLoading}
                          onClick={() => handleToggleStock(item, stockState === 'in_stock' ? 'unknown' : 'in_stock')}
                          title="Op voorraad"
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border ${
                            stockState === 'in_stock'
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                              : 'border-gray-200 text-gray-300 hover:border-emerald-300 hover:text-emerald-400'
                          } disabled:opacity-40`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Date column */}
                  <td className="py-3 px-4">
                    {item.geleverd ? (
                      // Delivered: show date read-only + undo button
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-semibold">
                          {item.verwachte_datum || '—'}
                        </span>
                        <button
                          type="button"
                          disabled={isSaving || actionLoading}
                          onClick={() => handleUndoDelivery(item)}
                          title="Levering ongedaan maken"
                          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 font-bold border border-gray-200 hover:border-red-200 hover:bg-red-50 rounded-md px-1.5 py-1 transition-all disabled:opacity-40"
                        >
                          {isSaving
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RotateCcw className="w-3 h-3" />
                          }
                          Ongedaan
                        </button>
                      </div>
                    ) : (isInStock || isNotInStock) ? (
                      // Editable date for both in-stock (planned delivery) and not-in-stock (estimated availability)
                      <div className="space-y-0.5">
                        <input
                          type="date"
                          value={item.verwachte_datum || ''}
                          onChange={(e) => handleItemDateChange(item, e.target.value)}
                          disabled={actionLoading}
                          className={`w-full text-xs font-semibold py-1.5 px-2.5 border rounded-lg focus:outline-none focus:ring-1 disabled:opacity-50 ${
                            isInStock
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-800 focus:ring-emerald-300'
                              : 'border-amber-200 bg-amber-50/50 text-amber-800 focus:ring-amber-300'
                          }`}
                        />
                        <div className={`text-[9px] font-semibold ${isInStock ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {isInStock ? 'Geplande leverdatum' : 'Geschatte beschikbaarheid'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    {item.geleverd ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Check className="w-3 h-3" /> Geleverd
                      </span>
                    ) : stockState === 'in_stock' ? (
                      <span className="text-[10px] font-bold text-emerald-500">Op voorraad</span>
                    ) : stockState === 'not_in_stock' ? (
                      <span className="text-[10px] font-bold text-amber-500">Nalevering</span>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Action buttons — only when in-stock pending items exist */}
      {canPlanDelivery && (
        <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" />
            Leveringsbeheer — {inStockPending.length} item(s) op voorraad
            {isPartial && `, ${notInStockPending.length} in nalevering`}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Plan delivery */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handlePlanDelivery}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D10056] hover:bg-[#B00047] text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              Levering inplannen
            </button>

            {/* Confirm delivery */}
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleConfirmDelivery}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isPartial
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPartial ? <PackagePlus className="w-4 h-4" /> : <PackageCheck className="w-4 h-4" />}
              {isPartial ? 'Deellevering bevestigen' : 'Levering bevestigen'}
            </button>
          </div>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            <strong className="text-[#D10056]">Inplannen</strong> slaat de datums op en zet de status op "Ingepland". 
            <strong className="text-emerald-600"> Bevestigen</strong> markeert de items effectief als geleverd.
          </p>
        </div>
      )}

      {/* All delivered */}
      {pendingItems.length === 0 && items.length > 0 && (
        <div className="text-center py-4 text-xs text-emerald-600 font-bold bg-emerald-50 rounded-xl border border-emerald-100">
          <Check className="w-5 h-5 mx-auto mb-1" />
          Alle items zijn geleverd
        </div>
      )}
    </div>
  )
}
