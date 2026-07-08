'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrderItem, OrderStatus } from '@/types/database.types'
import { Check, X, Minus, PackageCheck, PackagePlus, Loader2, AlertCircle, Calendar } from 'lucide-react'

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

  // Leverdatum for in-stock delivery
  const [leverdatum, setLeverdatum] = useState<string>('')

  const pendingItems = items.filter(i => !i.geleverd)
  const inStockPending = pendingItems.filter(i => i.op_voorraad === true)
  const notInStockPending = pendingItems.filter(i => i.op_voorraad === false)
  const deliveredItems = items.filter(i => i.geleverd)

  const hasDelivery = inStockPending.length > 0
  const allPendingInStock = inStockPending.length > 0 && notInStockPending.length === 0
  const isPartial = inStockPending.length > 0 && notInStockPending.length > 0

  // Toggle stock status for a single item
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

  // Save per-item estimated date
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

  // Execute delivery for all in-stock items
  const handleDelivery = async () => {
    if (!leverdatum) {
      setError('Geef een leverdatum op voor de items die op voorraad zijn.')
      return
    }
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd.')

      // Mark in-stock pending items as delivered
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ geleverd: true })
        .in('id', inStockPending.map(i => i.id))

      if (itemsError) throw new Error(itemsError.message)

      // Determine new order status
      const newStatus: OrderStatus = allPendingInStock ? 'bestelling geleverd' : 'deellevering uitgevoerd'

      // Update order: status + leverdatum
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          leverdatum: leverdatum,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      if (orderError) throw new Error(orderError.message)

      // Audit trail
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        changed_by: user.id,
        old_status: orderStatus,
        new_status: newStatus,
        metadata: {
          actie: allPendingInStock ? 'volledige levering' : 'deellevering',
          geleverd_items: inStockPending.length,
          leverdatum: leverdatum
        }
      })

      const msg = allPendingInStock
        ? `Volledige levering uitgevoerd op ${leverdatum}. Alle ${inStockPending.length} items geleverd.`
        : `Deellevering uitgevoerd op ${leverdatum} (${inStockPending.length} items). ${notInStockPending.length} item(s) in nalevering.`

      setSuccessMsg(msg)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Onbekende fout.')
    } finally {
      setActionLoading(false)
    }
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
              <th className="py-2.5 px-4">Geschatte datum</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const mat = item.materials as any
              const stockState = getStockState(item.op_voorraad)
              const isSaving = saving === item.id
              const isNotInStock = stockState === 'not_in_stock'

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    item.geleverd
                      ? 'bg-emerald-50/40 opacity-60'
                      : isNotInStock
                      ? 'bg-amber-50/30'
                      : stockState === 'in_stock'
                      ? 'bg-emerald-50/20'
                      : 'bg-white'
                  }`}
                >
                  {/* Material info */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-gray-800">{mat?.kleur || 'Onbekend'}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {mat ? `${mat.merk} · ${mat.code} · ${mat.dikte_mm}mm · ${mat.afwerking}` : ''}
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-3 px-4 text-center font-extrabold text-gray-700">
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
                        {/* Not in stock */}
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

                        {/* Reset to unknown */}
                        <button
                          type="button"
                          disabled={isSaving || actionLoading}
                          onClick={() => handleToggleStock(item, 'unknown')}
                          title="Nog niet gecheckt"
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border ${
                            stockState === 'unknown'
                              ? 'bg-gray-400 border-gray-400 text-white shadow-sm'
                              : 'border-gray-200 text-gray-300 hover:border-gray-400 hover:text-gray-400'
                          } disabled:opacity-40`}
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        {/* In stock */}
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

                  {/* Per-item estimated date (only for not-in-stock, not delivered) */}
                  <td className="py-3 px-4">
                    {!item.geleverd && isNotInStock ? (
                      <input
                        type="date"
                        value={item.verwachte_datum || ''}
                        onChange={(e) => handleItemDateChange(item, e.target.value)}
                        disabled={actionLoading}
                        className="w-full text-xs font-semibold py-1.5 px-2.5 border border-amber-200 rounded-lg bg-amber-50/50 text-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-300 disabled:opacity-50"
                      />
                    ) : item.geleverd ? (
                      <span className="text-[10px] text-gray-400 italic">—</span>
                    ) : (
                      <span className="text-[10px] text-gray-300">—</span>
                    )}
                  </td>

                  {/* Status label */}
                  <td className="py-3 px-4 text-center">
                    {item.geleverd ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <Check className="w-3 h-3" /> Geleverd
                      </span>
                    ) : stockState === 'in_stock' ? (
                      <span className="text-[10px] font-bold text-emerald-500">Klaar</span>
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

      {/* Delivery section — only shown when there are in-stock items to deliver */}
      {hasDelivery && (
        <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {isPartial ? 'Deellevering — Leverdatum bij klant' : 'Levering — Leverdatum bij klant'}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="date"
              value={leverdatum}
              onChange={(e) => { setLeverdatum(e.target.value); setError(null) }}
              disabled={actionLoading}
              className="flex-1 text-xs font-semibold py-2.5 px-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#D10056] disabled:opacity-50"
            />
            <button
              type="button"
              disabled={actionLoading || !leverdatum}
              onClick={handleDelivery}
              className={`flex items-center gap-2 px-4 py-2.5 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isPartial
                  ? 'bg-violet-600 hover:bg-violet-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : isPartial
                  ? <PackagePlus className="w-4 h-4" />
                  : <PackageCheck className="w-4 h-4" />
              }
              {isPartial
                ? `Deellevering (${inStockPending.length} st.)`
                : `Levering (${inStockPending.length} st.)`
              }
            </button>
          </div>

          {isPartial && (
            <p className="text-[10px] text-amber-600 font-semibold">
              {notInStockPending.length} item(s) worden nageverd. Stel hierboven per item een geschatte datum in.
            </p>
          )}
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
