'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Material } from '@/types/database.types'
import { ChevronRight, ChevronLeft, Check, Plus, Trash2, Loader2, Sparkles, LayoutList } from 'lucide-react'

interface OrderFormProps {
  materials: Material[]
}

interface SelectedPlateItem {
  id: string // unique local ID
  material: Material
  lengte: number
  breedte: number
  aantal: number
}

export default function OrderForm({ materials }: OrderFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Material, 2: Dimensions & Items, 3: Remarks & Confirm
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Selection state
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [plateItems, setPlateItems] = useState<SelectedPlateItem[]>([])
  
  // Temporary input state for adding plate items
  const [tempLengte, setTempLengte] = useState<number | ''>('')
  const [tempBreedte, setTempBreedte] = useState<number | ''>('')
  const [tempAantal, setTempAantal] = useState<number | ''>(1)
  
  // General order remarks
  const [opmerkingen, setOpmerkingen] = useState('')

  // Material filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMerk, setFilterMerk] = useState<string>('Alle')
  const [filterDikte, setFilterDikte] = useState<string>('Alle')
  const [filterAfwerking, setFilterAfwerking] = useState<string>('Alle')

  // Get unique filter values
  const uniqueMerken = useMemo(() => ['Alle', ...Array.from(new Set(materials.map(m => m.merk)))], [materials])
  const uniqueDiktes = useMemo(() => ['Alle', ...Array.from(new Set(materials.map(m => String(m.dikte_mm))))], [materials])
  const uniqueAfwerkingen = useMemo(() => ['Alle', ...Array.from(new Set(materials.map(m => m.afwerking)))], [materials])

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = 
        m.kleur.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.merk.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesMerk = filterMerk === 'Alle' || m.merk === filterMerk
      const matchesDikte = filterDikte === 'Alle' || String(m.dikte_mm) === filterDikte
      const matchesAfwerking = filterAfwerking === 'Alle' || m.afwerking === filterAfwerking
      
      return matchesSearch && matchesMerk && matchesDikte && matchesAfwerking
    })
  }, [materials, searchQuery, filterMerk, filterDikte, filterAfwerking])

  // Add item to the order list
  const handleAddItem = () => {
    if (!selectedMaterial) return
    if (!tempLengte || !tempBreedte || !tempAantal) {
      alert('Vul a.u.b. alle afmetingen en het aantal in.')
      return
    }

    const newItem: SelectedPlateItem = {
      id: Math.random().toString(36).substr(2, 9),
      material: selectedMaterial,
      lengte: Number(tempLengte),
      breedte: Number(tempBreedte),
      aantal: Number(tempAantal)
    }

    setPlateItems([...plateItems, newItem])
    setTempLengte('')
    setTempBreedte('')
    setTempAantal(1)
  }

  const handleRemoveItem = (id: string) => {
    setPlateItems(plateItems.filter(item => item.id !== id))
  }

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (plateItems.length === 0) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('U bent niet ingelogd.')
        setLoading(false)
        return
      }

      // 1. Insert main order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          klant_id: user.id,
          status: 'bestelling doorgestuurd',
          opmerkingen: opmerkingen || null
        })
        .select()
        .single()

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Fout bij het aanmaken van de bestelling.')
      }

      // 2. Insert order items
      const itemsToInsert = plateItems.map(item => ({
        order_id: order.id,
        material_id: item.material.id,
        lengte_mm: item.lengte,
        breedte_mm: item.breedte,
        aantal: item.aantal
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert)

      if (itemsError) {
        throw new Error(itemsError.message)
      }

      // 3. Write initial status in history / audit trail
      await supabase
        .from('order_status_history')
        .insert({
          order_id: order.id,
          changed_by: user.id,
          old_status: null,
          new_status: 'bestelling doorgestuurd'
        })

      router.refresh()
      router.push('/portaal/klant')
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden bij het verzenden.')
      setLoading(false)
    }
  }

  // Stepper Header renderer
  const renderStepper = () => (
    <div className="flex items-center justify-between border-b border-gray-100 pb-6 mb-6 overflow-x-auto gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span className={`wizard-step ${step === 1 ? 'wizard-step-active' : 'wizard-step-inactive'}`}>1</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${step === 1 ? 'text-[#D10056]' : 'text-gray-400'}`}>
          Materiaal Selectie
        </span>
      </div>
      <div className="w-10 h-[2px] bg-gray-200 shrink-0" />
      <div className="flex items-center gap-2 shrink-0">
        <span className={`wizard-step ${step === 2 ? 'wizard-step-active' : 'wizard-step-inactive'}`}>2</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${step === 2 ? 'text-[#D10056]' : 'text-gray-400'}`}>
          Afmetingen & Aantallen
        </span>
      </div>
      <div className="w-10 h-[2px] bg-gray-200 shrink-0" />
      <div className="flex items-center gap-2 shrink-0">
        <span className={`wizard-step ${step === 3 ? 'wizard-step-active' : 'wizard-step-inactive'}`}>3</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${step === 3 ? 'text-[#D10056]' : 'text-gray-400'}`}>
          Bevestigen & Opmerkingen
        </span>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Wizard steps content */}
      <div className="lg:col-span-2 bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {renderStepper()}

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-600 font-semibold rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* STEP 1: MATERIAL SELECTION */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Selecteer een materiaal</h2>
              <p className="text-sm text-gray-400">Kies een plaat uit de actieve catalogus.</p>
            </div>

            {/* Filters panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Merk</label>
                <select
                  value={filterMerk}
                  onChange={(e) => setFilterMerk(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 border border-gray-200 rounded-lg bg-gray-50/50"
                >
                  {uniqueMerken.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dikte</label>
                <select
                  value={filterDikte}
                  onChange={(e) => setFilterDikte(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 border border-gray-200 rounded-lg bg-gray-50/50"
                >
                  {uniqueDiktes.map(d => (
                    <option key={d} value={d}>{d === 'Alle' ? d : `${d} mm`}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Afwerking</label>
                <select
                  value={filterAfwerking}
                  onChange={(e) => setFilterAfwerking(e.target.value)}
                  className="w-full text-xs font-semibold py-2.5 px-3 border border-gray-200 rounded-lg bg-gray-50/50"
                >
                  {uniqueAfwerkingen.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Zoek op Kleur of Code</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Bijv. Altissimo, White, U999..."
                  className="w-full text-xs font-semibold py-2.5 px-3 border border-gray-200 rounded-lg bg-gray-50/50"
                />
              </div>
            </div>

            {/* Materials Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-2">
              {filteredMaterials.map((mat) => {
                const isSelected = selectedMaterial?.id === mat.id
                return (
                  <button
                    key={mat.id}
                    onClick={() => setSelectedMaterial(mat)}
                    className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-[#D10056] bg-[#FFF0F5]/30 shadow-sm shadow-[#D10056]/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[10px] bg-gray-100 text-gray-600 font-extrabold uppercase px-2 py-0.5 rounded">
                        {mat.merk}
                      </span>
                      {isSelected && (
                        <span className="w-5 h-5 bg-[#D10056] rounded-full flex items-center justify-center text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-800">{mat.kleur}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">Code: {mat.code}</p>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400 pt-2 border-t border-gray-50">
                      <span>Dikte: <strong className="text-gray-700">{mat.dikte_mm} mm</strong></span>
                      <span>Afwerking: <strong className="text-gray-700">{mat.afwerking}</strong></span>
                    </div>
                  </button>
                )
              })}

              {filteredMaterials.length === 0 && (
                <div className="col-span-2 text-center py-10 text-gray-400 text-xs font-medium">
                  Geen materialen gevonden die voldoen aan de filters.
                </div>
              )}
            </div>

            {/* Button Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.push('/portaal/klant')}
                className="px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50"
              >
                Sluiten
              </button>
              <button
                type="button"
                disabled={!selectedMaterial}
                onClick={() => setStep(2)}
                className={`px-6 py-3 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  selectedMaterial
                    ? 'bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] shadow-md shadow-[#D10056]/10'
                    : 'bg-[#E673A4] opacity-50 cursor-not-allowed'
                }`}
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DIMENSIONS & QUANTITIES */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Afmetingen & Aantallen</h2>
              <p className="text-sm text-gray-400">Voeg één of meerdere platen toe aan uw bestelling.</p>
            </div>

            {/* Material Card header preview */}
            {selectedMaterial && (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] bg-gray-200/80 px-2 py-0.5 rounded font-extrabold text-gray-600 uppercase">
                    Geselecteerd Materiaal
                  </span>
                  <h3 className="font-extrabold text-sm text-gray-800 mt-1.5">
                    {selectedMaterial.kleur} ({selectedMaterial.code})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Merk: {selectedMaterial.merk} | Dikte: {selectedMaterial.dikte_mm} mm | Afwerking: {selectedMaterial.afwerking}
                  </p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-[#D10056] font-bold hover:underline"
                >
                  Wijzig
                </button>
              </div>
            )}

            {/* Add item input panel */}
            <div className="bg-white border border-gray-150 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#D10056]" />
                Plaat toevoegen
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lengte (mm)</label>
                  <input
                    type="number"
                    value={tempLengte}
                    onChange={(e) => setTempLengte(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Bijv. 1200"
                    className="w-full artimar-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Breedte (mm)</label>
                  <input
                    type="number"
                    value={tempBreedte}
                    onChange={(e) => setTempBreedte(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Bijv. 600"
                    className="w-full artimar-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Aantal</label>
                  <input
                    type="number"
                    min="1"
                    value={tempAantal}
                    onChange={(e) => setTempAantal(e.target.value ? Number(e.target.value) : '')}
                    className="w-full artimar-input"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Plaat toevoegen aan lijst
              </button>
            </div>

            {/* List of items added */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <LayoutList className="w-3.5 h-3.5" />
                Ingevoerde platen ({plateItems.length})
              </h3>
              
              {plateItems.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 text-gray-400 text-xs rounded-xl font-medium">
                  Nog geen platen toegevoegd aan de lijst.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Materiaal</th>
                        <th className="py-2.5 px-4">Dikte</th>
                        <th className="py-2.5 px-4">Afmetingen (L x B)</th>
                        <th className="py-2.5 px-4 text-center">Aantal</th>
                        <th className="py-2.5 px-4 text-right">Actie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {plateItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-semibold">
                            {item.material.kleur} ({item.material.code})
                          </td>
                          <td className="py-3 px-4">{item.material.dikte_mm} mm</td>
                          <td className="py-3 px-4">{item.lengte} x {item.breedte} mm</td>
                          <td className="py-3 px-4 text-center font-extrabold">{item.aantal} st.</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Button Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
              <button
                type="button"
                disabled={plateItems.length === 0}
                onClick={() => setStep(3)}
                className={`px-6 py-3 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  plateItems.length > 0
                    ? 'bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] shadow-md shadow-[#D10056]/10'
                    : 'bg-[#E673A4] opacity-50 cursor-not-allowed'
                }`}
              >
                Volgende
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REMARKS & CONFIRMATION */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Bevestigen & Opmerkingen</h2>
              <p className="text-sm text-gray-400">Controleer uw bestelling en voeg eventueel opmerkingen toe.</p>
            </div>

            {/* Remarks box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Opmerkingen voor Artimar
              </label>
              <textarea
                value={opmerkingen}
                onChange={(e) => setOpmerkingen(e.target.value)}
                placeholder="Bijv. Instructies over levering, specifieke afwerking details, etc..."
                className="w-full artimar-input h-28 resize-none"
              />
            </div>

            {/* Items summary table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Bestelling Overzicht</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Plaat Details</th>
                      <th className="py-2.5 px-4">Afmetingen</th>
                      <th className="py-2.5 px-4 text-right">Aantal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {plateItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <span className="font-semibold">{item.material.kleur}</span>
                          <span className="text-gray-400 text-[10px] block mt-0.5">
                            Merk: {item.material.merk} | Code: {item.material.code} | Dikte: {item.material.dikte_mm} mm
                          </span>
                        </td>
                        <td className="py-3 px-4">{item.lengte} x {item.breedte} mm</td>
                        <td className="py-3 px-4 text-right font-extrabold">{item.aantal} st.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Button Actions */}
            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(2)}
                className="px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Vorige
              </button>
              <button
                type="button"
                disabled={loading || plateItems.length === 0}
                onClick={handleSubmitOrder}
                className="px-6 py-3 bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-[#D10056]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Bestelling versturen...
                  </>
                ) : (
                  <>
                    Bestelling verzenden
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Summary Card (Matches mockup) */}
      <div className="lg:col-span-1 bg-white border border-gray-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-6">
        <h3 className="text-base font-extrabold text-gray-900 tracking-tight mb-0.5">Samenvatting</h3>
        <p className="text-xs text-gray-400 mb-6">Uw configuratie</p>

        <div className="space-y-4 divide-y divide-gray-50 text-xs">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Materiaal</span>
            <span className="font-bold text-gray-800 text-right">
              {selectedMaterial ? selectedMaterial.merk : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Kleur</span>
            <span className="font-bold text-gray-800 text-right">
              {selectedMaterial ? selectedMaterial.kleur : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Code</span>
            <span className="font-bold text-gray-800 text-right font-mono">
              {selectedMaterial ? selectedMaterial.code : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Dikte</span>
            <span className="font-bold text-gray-800 text-right">
              {selectedMaterial ? `${selectedMaterial.dikte_mm} mm` : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Afwerking</span>
            <span className="font-bold text-gray-800 text-right">
              {selectedMaterial ? selectedMaterial.afwerking : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Ingevoerde platen</span>
            <span className="font-bold text-gray-800 text-right">
              {plateItems.length > 0 ? `${plateItems.length} type(s)` : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Totaal aantal platen</span>
            <span className="font-bold text-gray-800 text-right">
              {plateItems.length > 0 
                ? `${plateItems.reduce((acc, item) => acc + item.aantal, 0)} stuks`
                : '-'
              }
            </span>
          </div>
        </div>

        {/* Small branding hint in summary */}
        <div className="mt-8 p-4 bg-[#FFF0F5] border border-[#FAD0E0]/60 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D10056] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-[10px] leading-normal text-gray-500 font-medium">
            Artimar levert maatwerk in marmer, graniet, composiet en keramiek met passie.
          </div>
        </div>
      </div>
    </div>
  )
}
