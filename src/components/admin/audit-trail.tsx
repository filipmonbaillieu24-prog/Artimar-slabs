'use client'

import { OrderStatusHistory } from '@/types/database.types'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Calendar, User, Info } from 'lucide-react'

interface AuditTrailProps {
  history: OrderStatusHistory[]
}

export default function AuditTrail({ history }: AuditTrailProps) {
  if (history.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-center text-xs text-gray-400 py-8">
        Nog geen statusgeschiedenis geregistreerd.
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-6">
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Statusgeschiedenis</h3>
        <p className="text-xs text-gray-400">Audit trail van alle statuswijzigingen.</p>
      </div>

      <div className="relative border-l-2 border-gray-150 pl-6 ml-3 space-y-8 text-xs">
        {history.map((log) => {
          const userEmail = log.profiles?.email || 'Systeem'
          const userName = log.profiles?.bedrijfsnaam || 'Systeem'
          const meta = log.metadata

          return (
            <div key={log.id} className="relative">
              {/* Timeline marker */}
              <span className="absolute -left-[31px] top-0 w-4.5 h-4.5 bg-white border-2 border-[#D10056] rounded-full flex items-center justify-center shadow-sm">
                <span className="w-1.5 h-1.5 bg-[#D10056] rounded-full" />
              </span>

              {/* Log details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-400 text-[10px]">
                  <span className="font-extrabold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-300" />
                    {formatDateTime(log.changed_at)}
                  </span>
                  <span>&bull;</span>
                  <span className="font-semibold flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-300" />
                    {userName} ({userEmail})
                  </span>
                </div>

                <div className="text-gray-800 font-medium">
                  {log.old_status ? (
                    <span>
                      Status gewijzigd naar <strong className="text-[#D10056] font-bold">'{log.new_status}'</strong>
                      <span className="text-gray-400 font-normal"> (was '{log.old_status}')</span>
                    </span>
                  ) : (
                    <span>
                      Bestelling aangemaakt met status <strong className="text-[#D10056] font-bold">'{log.new_status}'</strong>
                    </span>
                  )}
                </div>

                {/* Conditional metadata details */}
                {meta && (meta.verwachte_datum || meta.leverdatum) && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-gray-600 mt-1">
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                    {meta.verwachte_datum && (
                      <span>Verwachte datum: <strong>{formatDate(meta.verwachte_datum)}</strong></span>
                    )}
                    {meta.leverdatum && (
                      <span>Definitieve leverdatum: <strong>{formatDate(meta.leverdatum)}</strong></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
