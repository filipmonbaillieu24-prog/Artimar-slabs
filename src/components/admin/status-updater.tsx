'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Order, OrderStatus } from '@/types/database.types'
import { Loader2, RefreshCw, Trash2 } from 'lucide-react'

interface StatusUpdaterProps {
  order: Order
}

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'bestelling doorgestuurd', label: 'Bestelling doorgestuurd' },
  { value: 'bestelling ontvangen', label: 'Bestelling ontvangen' },
  { value: 'materiaal voorradig', label: 'Materiaal voorradig' },
  { value: 'materiaal niet voorradig', label: 'Materiaal niet voorradig' },
  { value: 'bestelling ingepland voor levering', label: 'Bestelling ingepland voor levering' },
]

export default function StatusUpdater({ order }: StatusUpdaterProps) {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<OrderStatus>(order.status)
  const [verwachteDatum, setVerwachteDatum] = useState<string>(order.verwachte_datum || '')
  const [leverdatum, setLeverdatum] = useState<string>(order.leverdatum || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleDeleteOrder = async () => {
    if (!window.confirm('Weet u zeker dat u deze bestelling permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id)

      if (deleteError) throw deleteError

      router.refresh()
      router.push('/portaal/admin')
    } catch (err: any) {
      setError(err.message || 'Fout bij het verwijderen van de bestelling.')
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Validation checks
    if (status === 'materiaal niet voorradig' && !verwachteDatum) {
      setError('Verwachte datum is verplicht bij status "Materiaal niet voorradig".')
      setLoading(false)
      return
    }

    if (status === 'bestelling ingepland voor levering' && !leverdatum) {
      setError('Leverdatum is verplicht bij status "Bestelling ingepland voor levering".')
      setLoading(false)
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('U bent niet geautoriseerd.')

      // Prepare updates
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
        verwachte_datum: verwachteDatum || null,
        leverdatum: leverdatum || null,
      }

      // 1. Update the order
      const { error: orderError } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', order.id)

      if (orderError) throw new Error(orderError.message)

      // 2. Insert into history / audit trail
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          changed_by: user.id,
          old_status: order.status,
          new_status: status,
          metadata: {
            verwachte_datum: verwachteDatum || null,
            leverdatum: leverdatum || null,
          }
        })

      if (historyError) throw new Error(historyError.message)

      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Fout bij het updaten van de status.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Status Beheren</h3>
        <p className="text-xs text-gray-400">Wijzig de status van deze platenbestelling.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-600 text-xs font-semibold rounded-lg">
            Status succesvol bijgewerkt!
          </div>
        )}

        {/* Status Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Bestelling Status
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as OrderStatus)
              setSuccess(false)
            }}
            className="w-full text-xs font-semibold py-2.5 px-3 border border-gray-250 rounded-lg bg-gray-50/50"
            disabled={loading}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Field: Expected Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Verwachte Datum {status === 'materiaal niet voorradig' && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            value={verwachteDatum}
            onChange={(e) => {
              setVerwachteDatum(e.target.value)
              setSuccess(false)
            }}
            className="w-full artimar-input text-xs"
            disabled={loading}
          />
        </div>

        {/* Field: Delivery Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Definitieve Leverdatum {status === 'bestelling ingepland voor levering' && <span className="text-red-500">*</span>}
          </label>
          <input
            type="date"
            value={leverdatum}
            onChange={(e) => {
              setLeverdatum(e.target.value)
              setSuccess(false)
            }}
            className="w-full artimar-input text-xs"
            disabled={loading}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Bezig met bijwerken...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              Status opslaan
            </>
          )}
        </button>
      </form>

      <div className="border-t border-gray-150 pt-4 mt-6">
        <button
          type="button"
          disabled={loading}
          onClick={handleDeleteOrder}
          className="w-full py-3.5 border border-red-200 hover:border-red-300 hover:bg-red-50/50 text-red-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
          Bestelling Verwijderen
        </button>
      </div>
    </div>
  )
}
