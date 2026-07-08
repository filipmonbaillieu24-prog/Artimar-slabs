'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OrderItem, OrderStatus } from '@/types/database.types'
import { Check, X, Minus, PackageCheck, PackagePlus, Loader2, AlertCircle } from 'lucide-react'

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
  const [saving, setSaving] = useState<string | null>(null) // item id being saved
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const pendingItems = items.filter(i => !i.geleverd)
  const inStockPending = pendingItems.filter(i => i.op_voorraad === true)
  const notInStockPending = pendingItems.filter(i => i.op_voorraad === false)
  const deliveredItems = items.filter(i => i.geleverd)

  const canDoDeellevering = inStockPending.length > 0 && notInStockPending.length > 0
  const canDoFullDelivery = inStockPending.length > 0 && notInStockPending.length === 0 && pendingItems.length > 0
  const canDoNalevering = deliveredItems.length > 0 && notInStockPending.length > 0 && inStockPending.length > 0

  // Toggle a single item's stock status
  const handleToggleStock = async (item: OrderItem, newState: StockState) => {
    const newVal = newState === 'in_stock' ? true : newState === 'not_in_stock' ? false : null
    setSaving(item.id)
    setError(null)
    setSuccessMsg(null)

    const updated = items.map(i => i.id === item.id ? { ...i, op_voorraad: newVal } : i)
    setItems(updated) // optimistic update

    const { error: updateError } = await supabase
      .from('order_items')
      .update({ op_voorraad: newVal })
      .eq('id', item.id)

    if (updateError) {
      setItems(items) // revert
      setError(`Fout bij opslaan: ${updateError.message}`)
    }

    setSaving(null)
  }

  // Execute a (partial) delivery
  const handleDelivery = async (type: 'deellevering' | 'volledig') => {
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd.')

      // Mark in-stock pending items as delivered
      const toDeliver = pendingItems.filter(i => i.op_voorraad === true)
      if (toDeliver.length === 0) throw new Error('Geen voorradige items om te leveren.')

      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ geleverd: true })
        .in('id', toDeliver.map(i => i.id))

      if (itemsError) throw new Error(itemsError.message)

      // Determine new order status
      const newStatus: OrderStatus = type === 'volledig'
        ? 'bestelling geleverd'
        : 'deellevering uitgevoerd'

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)

      if (orderError) throw new Error(orderError.message)

      // Audit trail
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        changed_by: user.id,
        old_status: orderStatus,
        new_status: newStatus,
        metadata: { actie: type, geleverd_items: toDeliver.length }
      })

      const msg = type === 'volledig'
        ? `Volledige levering uitgevoerd (${toDeliver.length} items).`
        : `Deellevering uitgevoerd (${toDeliver.length} items). ${notInStockPending.length} item(s) staan nog open voor nalevering.`

      setSuccessMsg(msg)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Onbekende fout.')
    } finally {
      setActionLoading(false)
    }
  }

  // Execute nalevering
  const handleNalevering = async () => {
    setActionLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Niet ingelogd.')

      const toDeliver = notInStockPending.filter(i => i.op_voorraad === true)
      const allNotDeliveredNowInStock = pendingItems.filter(i => i.op_voorraad === true)

      if (allNotDeliveredNowInStock.length === 0) throw new Error('Markeer eerst de naleveringsitems als "Op voorraad".')

      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ geleverd: true })
        .in('id', allNotDeliveredNowInStock.map(i => i.id))

      if (itemsError) throw new Error(itemsError.message)

      const stillPending = pendingItems.filter(i => !allNotDeliveredNowInStock.find(d => d.id === i.id))
      const newStatus: OrderStatus = stillPending.length === 0 ? 'nalevering geleverd' : 'deellevering uitgevoerd'

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
        metadata: { actie: 'nalevering', geleverd_items: allNotDeliveredNowInStock.length }
      })

      setSuccessMsg(`Nalevering uitgevoerd (${allNotDeliveredNowInStock.length} items).`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Onbekende fout.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-4">

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
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
          <div className="text-xl font-black text-emerald-600">{inStockPending.length}</div>
          <div className="text-emerald-600">Op voorraad</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
          <div className="text-xl font-black text-amber-600">{notInStockPending.length}</div>
          <div className="text-amber-600">Niet voorradig</div>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2">
          <div className="text-xl font-black text-gray-500">{deliveredItems.length}</div>
          <div className="text-gray-500">Geleverd</div>
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
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item) => {
              const mat = item.materials as any
              const stockState = getStockState(item.op_voorraad)
              const isSaving = saving === item.id

              return (
                <tr
                  key={item.id}
                  className={`transition-colors ${
                    item.geleverd
                      ? 'bg-emerald-50/30 opacity-70'
                      : stockState === 'not_in_stock'
                      ? 'bg-amber-50/20'
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
                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Geleverd</span>
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

                        {/* Unknown / reset */}
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

                  {/* Delivery status */}
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

      {/* Action buttons */}
      {pendingItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-100">
          {/* Full delivery (all pending are in stock) */}
          {canDoFullDelivery && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleDelivery('volledig')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Volledige levering uitvoeren ({inStockPending.length} items)
            </button>
          )}

          {/* Partial delivery */}
          {canDoDeellevering && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleDelivery('deellevering')}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />}
              Deellevering uitvoeren ({inStockPending.length} items, {notInStockPending.length} nalevering)
            </button>
          )}

          {/* Nalevering */}
          {canDoNalevering && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleNalevering}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
              Nalevering uitvoeren ({inStockPending.length} items)
            </button>
          )}
        </div>
      )}

      {pendingItems.length === 0 && items.length > 0 && (
        <div className="text-center py-4 text-xs text-emerald-600 font-bold bg-emerald-50 rounded-xl border border-emerald-100">
          <Check className="w-5 h-5 mx-auto mb-1" />
          Alle items zijn geleverd
        </div>
      )}
    </div>
  )
}
