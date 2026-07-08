'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Material } from '@/types/database.types'
import { Plus, Trash2, Loader2, Sparkles, AlertCircle } from 'lucide-react'

interface MaterialManagerProps {
  initialMaterials: Material[]
}

export default function MaterialManager({ initialMaterials }: MaterialManagerProps) {
  const router = useRouter()
  const supabase = createClient()

  const [materials, setMaterials] = useState<Material[]>(initialMaterials)
  
  // Form state
  const [merk, setMerk] = useState('')
  const [code, setCode] = useState('')
  const [kleur, setKleur] = useState('')
  const [afwerking, setAfwerking] = useState('')
  const [dikte, setDikte] = useState<number | ''>('')
  
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!merk || !code || !kleur || !afwerking || !dikte) {
      setError('Vul a.u.b. alle velden in.')
      setLoading(false)
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from('materials')
        .insert({
          merk,
          code,
          kleur,
          afwerking,
          dikte_mm: Number(dikte),
        })
        .select()
        .single()

      if (insertError) throw new Error(insertError.message)

      setMaterials([data, ...materials])
      
      // Reset form
      setMerk('')
      setCode('')
      setKleur('')
      setAfwerking('')
      setDikte('')
      
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Fout bij het toevoegen van het materiaal.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Weet u zeker dat u dit materiaal wilt verwijderen? Dit kan invloed hebben op bestaande bestellingen.')) {
      return
    }
    
    setDeletingId(id)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)

      if (deleteError) throw new Error(deleteError.message)

      setMaterials(materials.filter(m => m.id !== id))
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Fout bij het verwijderen van het materiaal.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Add new material Form */}
      <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#D10056]" />
            Nieuw materiaal toevoegen
          </h3>
          <p className="text-xs text-gray-400">Voeg een nieuwe plaatconfiguratie toe aan de catalogus.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleAddMaterial} className="space-y-4 text-xs font-semibold">
          {/* Brand/Merk */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Merk / Soort</label>
            <input
              type="text"
              required
              value={merk}
              onChange={(e) => setMerk(e.target.value)}
              placeholder="Bijv. Composiet, Keramiek, Egger"
              className="w-full artimar-input"
              disabled={loading}
            />
          </div>

          {/* Code */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Product Code</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Bijv. Marazzi, U999, C100"
              className="w-full artimar-input"
              disabled={loading}
            />
          </div>

          {/* Color */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Kleur / Productnaam</label>
            <input
              type="text"
              required
              value={kleur}
              onChange={(e) => setKleur(e.target.value)}
              placeholder="Bijv. Altissimo, Premium Wit"
              className="w-full artimar-input"
              disabled={loading}
            />
          </div>

          {/* Finish */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Afwerking</label>
            <input
              type="text"
              required
              value={afwerking}
              onChange={(e) => setAfwerking(e.target.value)}
              placeholder="Bijv. Lux, Satin, Matte, ST9"
              className="w-full artimar-input"
              disabled={loading}
            />
          </div>

          {/* Thickness */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Dikte (mm)</label>
            <input
              type="number"
              required
              step="0.1"
              value={dikte}
              onChange={(e) => setDikte(e.target.value ? Number(e.target.value) : '')}
              placeholder="Bijv. 12, 18, 20"
              className="w-full artimar-input"
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-[#D10056]/10"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Bezig met toevoegen...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Materiaal opslaan
              </>
            )}
          </button>
        </form>
      </div>

      {/* Materials List */}
      <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-1">Actieve Catalogus</h3>
          <p className="text-xs text-gray-400">Deze materialen zijn momenteel beschikbaar voor partners.</p>
        </div>

        {materials.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            Nog geen materialen geconfigureerd.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-2.5 px-4">Merk</th>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Kleur / Naam</th>
                  <th className="py-2.5 px-4">Afwerking</th>
                  <th className="py-2.5 px-4">Dikte</th>
                  <th className="py-2.5 px-4 text-right">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {materials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-bold text-gray-800">{mat.merk}</td>
                    <td className="py-3 px-4 font-mono">{mat.code}</td>
                    <td className="py-3 px-4">{mat.kleur}</td>
                    <td className="py-3 px-4">{mat.afwerking}</td>
                    <td className="py-3 px-4">{mat.dikte_mm} mm</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={deletingId === mat.id}
                        onClick={() => handleDeleteMaterial(mat.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deletingId === mat.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
