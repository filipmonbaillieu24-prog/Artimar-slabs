'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Material } from '@/types/database.types'
import { ChevronRight, ChevronLeft, Check, Plus, Trash2, Loader2, Sparkles, LayoutList, MapPin, Truck, Info } from 'lucide-react'

interface OrderFormProps {
  materials: Material[]
}

interface SelectedPlateItem {
  id: string // unique local ID
  material: Material
  aantal: number
}

export default function OrderForm({ materials }: OrderFormProps) {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Material & Aantal, 2: Referentie & Levering, 3: Controleren & Bevestigen
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Selection state
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [plateItems, setPlateItems] = useState<SelectedPlateItem[]>([])
  
  // Temporary input state
  const [tempAantal, setTempAantal] = useState<number | ''>(1)
  
  // Delivery & Reference state
  const [referentie, setReferentie] = useState('')
  const [leveringMethode, setLeveringMethode] = useState<'standaard' | 'ander' | 'ophalen'>('standaard')
  const [leveringAdres, setLeveringAdres] = useState('')
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
    if (!tempAantal || Number(tempAantal) < 1) {
      alert('Vul a.u.b. een geldig aantal in.')
      return
    }

    // Check if material already added, if so merge quantity
    const existingIndex = plateItems.findIndex(item => item.material.id === selectedMaterial.id)
    if (existingIndex > -1) {
      const updated = [...plateItems]
      updated[existingIndex].aantal += Number(tempAantal)
      setPlateItems(updated)
    } else {
      const newItem: SelectedPlateItem = {
        id: Math.random().toString(36).substring(2, 9),
        material: selectedMaterial,
        aantal: Number(tempAantal)
      }
      setPlateItems([...plateItems, newItem])
    }

    setTempAantal(1)
    setSelectedMaterial(null)
  }

  const handleRemoveItem = (id: string) => {
    setPlateItems(plateItems.filter(item => item.id !== id))
  }

  // Handle order submission
  const handleSubmitOrder = async () => {
    if (plateItems.length === 0) return
    if (!referentie.trim()) {
      setError('Vul a.u.b. een bestelreferentie in.')
      setStep(2)
      return
    }
    if (leveringMethode === 'ander' && !leveringAdres.trim()) {
      setError('Vul a.u.b. het leveringsadres in.')
      setStep(2)
      return
    }

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
      const finalAddress = 
        leveringMethode === 'standaard' 
          ? 'Standaard partneradres' 
          : (leveringMethode === 'ophalen' ? 'Afhalen bij Artimar' : leveringAdres)

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          klant_id: user.id,
          status: 'bestelling doorgestuurd',
          opmerkingen: opmerkingen.trim() || null,
          referentie: referentie.trim(),
          levering_methode: leveringMethode,
          levering_adres: finalAddress
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
        lengte_mm: null, // Full slab, dimensions not required
        breedte_mm: null,
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
          Materiaal & Aantal
        </span>
      </div>
      <div className="w-10 h-[2px] bg-gray-200 shrink-0" />
      <div className="flex items-center gap-2 shrink-0">
        <span className={`wizard-step ${step === 2 ? 'wizard-step-active' : 'wizard-step-inactive'}`}>2</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${step === 2 ? 'text-[#D10056]' : 'text-gray-400'}`}>
          Referentie & Levering
        </span>
      </div>
      <div className="w-10 h-[2px] bg-gray-200 shrink-0" />
      <div className="flex items-center gap-2 shrink-0">
        <span className={`wizard-step ${step === 3 ? 'wizard-step-active' : 'wizard-step-inactive'}`}>3</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${step === 3 ? 'text-[#D10056]' : 'text-gray-400'}`}>
          Controleren & Bevestigen
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

        {/* STEP 1: MATERIAL & QUANTITY */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Selecteer materialen</h2>
              <p className="text-sm text-gray-400">Kies een materiaal, voer het aantal platen in en voeg het toe aan de lijst.</p>
            </div>

            {/* Quick Add Row (Only visible when material is selected) */}
            {selectedMaterial && (
              <div className="p-5 bg-pink-50/20 border border-[#FFF0F5] rounded-xl space-y-4 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[9px] bg-[#D10056] text-white px-2 py-0.5 rounded font-extrabold uppercase">
                      Gekozen plaat
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-800 mt-1.5">
                      {selectedMaterial.kleur} ({selectedMaterial.code})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Merk: {selectedMaterial.merk} | Dikte: {selectedMaterial.dikte_mm} mm | Afwerking: {selectedMaterial.afwerking}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedMaterial(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 font-semibold"
                  >
                    Annuleren
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="w-full sm:w-48 space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Aantal volledige platen</label>
                    <input
                      type="number"
                      min="1"
                      value={tempAantal}
                      onChange={(e) => setTempAantal(e.target.value ? Number(e.target.value) : '')}
                      className="w-full artimar-input"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Voeg toe
                  </button>
                </div>
              </div>
            )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
              {filteredMaterials.map((mat) => {
                const isSelected = selectedMaterial?.id === mat.id
                return (
                  <button
                    key={mat.id}
                    onClick={() => {
                      setSelectedMaterial(mat)
                      setTempAantal(1)
                    }}
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

            {/* List of items added */}
            <div className="space-y-3 pt-4 border-t border-gray-50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <LayoutList className="w-3.5 h-3.5" />
                Mee te bestellen platen ({plateItems.length})
              </h3>
              
              {plateItems.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-gray-200 text-gray-400 text-xs rounded-xl font-medium">
                  Nog geen platen toegevoegd. Selecteer hierboven een materiaal en voeg het toe.
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-xl bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-4">Materiaal</th>
                        <th className="py-2.5 px-4">Merk / Dikte</th>
                        <th className="py-2.5 px-4 text-center">Aantal (Volledige plaat)</th>
                        <th className="py-2.5 px-4 text-right">Actie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {plateItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-4 font-semibold">
                            {item.material.kleur} ({item.material.code})
                          </td>
                          <td className="py-3 px-4">{item.material.merk} | {item.material.dikte_mm} mm</td>
                          <td className="py-3 px-4 text-center font-black text-[#D10056]">{item.aantal} platen</td>
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
                onClick={() => router.push('/portaal/klant')}
                className="px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50"
              >
                Sluiten
              </button>
              <button
                type="button"
                disabled={plateItems.length === 0}
                onClick={() => setStep(2)}
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

        {/* STEP 2: REFERENTIE & LEVERING */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Referentie & Levering</h2>
              <p className="text-sm text-gray-400">Geef uw bestelling een kenmerk en kies hoe deze geleverd moet worden.</p>
            </div>

            {/* Reference Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Bestelreferentie / Projectnaam <span className="text-[#D10056]">*</span>
              </label>
              <input
                type="text"
                value={referentie}
                onChange={(e) => setReferentie(e.target.value)}
                placeholder="Bijv. Project Janssens Keuken of Ref-10492"
                className="w-full artimar-input font-semibold"
              />
              <p className="text-[10px] text-gray-400 font-medium">Dit kenmerk wordt getoond op uw pakbon/leveringsbon.</p>
            </div>

            {/* Delivery Methods Panel */}
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Leveringsmethode <span className="text-[#D10056]">*</span>
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Method standard */}
                <button
                  type="button"
                  onClick={() => setLeveringMethode('standaard')}
                  className={`p-5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    leveringMethode === 'standaard'
                      ? 'border-[#D10056] bg-[#FFF0F5]/20 shadow-sm shadow-[#D10056]/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Truck className={`w-5 h-5 ${leveringMethode === 'standaard' ? 'text-[#D10056]' : 'text-gray-400'}`} />
                  <h4 className="font-extrabold text-sm text-gray-800">Standaard Adres</h4>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Levering op uw geregistreerde partneradres.
                  </p>
                </button>

                {/* Method custom address */}
                <button
                  type="button"
                  onClick={() => setLeveringMethode('ander')}
                  className={`p-5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    leveringMethode === 'ander'
                      ? 'border-[#D10056] bg-[#FFF0F5]/20 shadow-sm shadow-[#D10056]/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <MapPin className={`w-5 h-5 ${leveringMethode === 'ander' ? 'text-[#D10056]' : 'text-gray-400'}`} />
                  <h4 className="font-extrabold text-sm text-gray-800">Ander Adres</h4>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Levering op een specifiek werven- of afwijkend adres.
                  </p>
                </button>

                {/* Method pickup */}
                <button
                  type="button"
                  onClick={() => setLeveringMethode('ophalen')}
                  className={`p-5 rounded-xl border text-left flex flex-col gap-2 transition-all ${
                    leveringMethode === 'ophalen'
                      ? 'border-[#D10056] bg-[#FFF0F5]/20 shadow-sm shadow-[#D10056]/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Info className={`w-5 h-5 ${leveringMethode === 'ophalen' ? 'text-[#D10056]' : 'text-gray-400'}`} />
                  <h4 className="font-extrabold text-sm text-gray-800">Afhalen (Ophalen)</h4>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    U komt de platen zelf ophalen in ons magazijn te Tongeren.
                  </p>
                </button>
              </div>
            </div>

            {/* Custom address textarea if selected */}
            {leveringMethode === 'ander' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                  Afwijkend Leveringsadres <span className="text-[#D10056]">*</span>
                </label>
                <textarea
                  value={leveringAdres}
                  onChange={(e) => setLeveringAdres(e.target.value)}
                  placeholder="Voer straatnaam, nummer, postcode en plaats in..."
                  className="w-full artimar-input h-24 resize-none"
                />
              </div>
            )}

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
                disabled={!referentie.trim() || (leveringMethode === 'ander' && !leveringAdres.trim())}
                onClick={() => setStep(3)}
                className={`px-6 py-3 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 transition-all ${
                  referentie.trim() && (leveringMethode !== 'ander' || leveringAdres.trim())
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

        {/* STEP 3: CONTROLEREN & BEVESTIGEN */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Bestelling controleren</h2>
              <p className="text-sm text-gray-400">Loop de bestelgegevens na voordat u deze verzendt naar Artimar.</p>
            </div>

            {/* Summary details card */}
            <div className="p-5 bg-gray-50 border border-gray-100 rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Bestelreferentie</span>
                  <strong className="text-sm font-black text-gray-800 block mt-0.5">{referentie}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Leveringsmethode</span>
                  <strong className="text-sm font-black text-gray-800 block mt-0.5">
                    {leveringMethode === 'standaard' 
                      ? 'Standaard Partneradres' 
                      : (leveringMethode === 'ophalen' ? 'Afhalen' : 'Afwijkend adres')
                    }
                  </strong>
                </div>
                {leveringMethode === 'ander' && (
                  <div className="sm:col-span-2 border-t border-gray-200/50 pt-2">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Leveringsadres</span>
                    <p className="text-gray-700 font-semibold mt-0.5 leading-relaxed">{leveringAdres}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items summary table */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Bestelde platen</h3>
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Plaat Details</th>
                      <th className="py-2.5 px-4">Merk / Dikte</th>
                      <th className="py-2.5 px-4 text-right">Aantal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {plateItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800">{item.material.kleur}</span>
                          <span className="text-gray-400 text-[10px] block mt-0.5">Code: {item.material.code} | Afwerking: {item.material.afwerking}</span>
                        </td>
                        <td className="py-3 px-4">{item.material.merk} | {item.material.dikte_mm} mm</td>
                        <td className="py-3 px-4 text-right font-black text-[#D10056]">{item.aantal} platen</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block">
                Eventuele opmerkingen voor Artimar (optioneel)
              </label>
              <textarea
                value={opmerkingen}
                onChange={(e) => setOpmerkingen(e.target.value)}
                placeholder="Bijv. Levering enkel in de voormiddag, of contactpersoon werf..."
                className="w-full artimar-input h-24 resize-none"
              />
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
                    Bestelling plaatsen
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
        <p className="text-xs text-gray-400 mb-6">Uw bestelling</p>

        <div className="space-y-4 divide-y divide-gray-50 text-xs">
          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Referentie</span>
            <span className="font-bold text-gray-800 text-right truncate max-w-[150px]">
              {referentie || '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Leveringsmethode</span>
            <span className="font-bold text-gray-800 text-right">
              {leveringMethode === 'standaard' 
                ? 'Standaard' 
                : (leveringMethode === 'ander' ? 'Ander adres' : 'Afhalen')
              }
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Ingevoerde plaattypes</span>
            <span className="font-bold text-gray-800 text-right">
              {plateItems.length > 0 ? `${plateItems.length}` : '-'}
            </span>
          </div>

          <div className="flex justify-between items-center py-2.5">
            <span className="text-gray-400 font-medium">Totaal aantal platen</span>
            <span className="font-black text-[#D10056] text-right text-sm">
              {plateItems.length > 0 
                ? `${plateItems.reduce((acc, item) => acc + item.aantal, 0)} platen`
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
