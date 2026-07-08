'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database.types'
import { Building, Phone, Clock, MapPin, Mail, Lock, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react'

interface SettingsFormProps {
  initialProfile: Profile
}

export default function SettingsForm({ initialProfile }: SettingsFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // Loading & feedback states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form states
  const [bedrijfsnaam, setBedrijfsnaam] = useState(initialProfile.bedrijfsnaam || '')
  const [contactnummer, setContactnummer] = useState(initialProfile.contactnummer || '')
  const [openingsuren, setOpeningsuren] = useState(initialProfile.openingsuren || '')
  const [standaardAdres, setStandaardAdres] = useState(initialProfile.standaard_adres || '')
  
  // Alternative addresses list
  const [andereAdressen, setAndereAdressen] = useState<string[]>(
    Array.isArray(initialProfile.andere_adressen) ? (initialProfile.andere_adressen as string[]) : []
  )
  const [newAdresInput, setNewAdresInput] = useState('')

  // Auth credential states
  const [email, setEmail] = useState(initialProfile.email || '')
  const [password, setPassword] = useState('')

  // Add alternative address to list
  const handleAddAddress = () => {
    if (!newAdresInput.trim()) return
    if (andereAdressen.includes(newAdresInput.trim())) {
      alert('Dit adres staat al in de lijst.')
      return
    }
    setAndereAdressen([...andereAdressen, newAdresInput.trim()])
    setNewAdresInput('')
  }

  // Remove alternative address from list
  const handleRemoveAddress = (addressToRemove: string) => {
    setAndereAdressen(andereAdressen.filter(addr => addr !== addressToRemove))
  }

  // Handle Form Submit
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // 1. Update Profile fields in public.profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          bedrijfsnaam: bedrijfsnaam.trim() || null,
          contactnummer: contactnummer.trim() || null,
          openingsuren: openingsuren.trim() || null,
          standaard_adres: standaardAdres.trim() || null,
          andere_adressen: andereAdressen
        })
        .eq('id', initialProfile.id)

      if (profileError) throw profileError

      // 2. Check if email changed
      let emailChangeTriggered = false
      if (email.trim() && email.trim().toLowerCase() !== initialProfile.email.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email.trim()
        })
        if (emailError) throw emailError
        emailChangeTriggered = true
      }

      // 3. Check if password is to be updated
      let passwordChangeTriggered = false
      if (password) {
        if (password.length < 6) {
          throw new Error('Het nieuwe wachtwoord moet ten minste 6 tekens bevatten.')
        }
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password
        })
        if (passwordError) throw passwordError
        passwordChangeTriggered = true
        setPassword('') // reset field
      }

      // Construct success text
      let successText = 'Uw instellingen en profielgegevens zijn succesvol opgeslagen.'
      if (emailChangeTriggered) {
        successText += ' Er is een bevestigingsmail gestuurd naar uw nieuwe e-mailadres om de wijziging te valideren.'
      }
      if (passwordChangeTriggered) {
        successText += ' Uw wachtwoord is succesvol gewijzigd.'
      }

      setSuccessMessage(successText)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Er is een fout opgetreden bij het opslaan van de gegevens.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-8 max-w-4xl">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 font-semibold rounded-xl text-sm border border-red-100">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 text-green-700 font-semibold rounded-xl text-sm border border-green-100 flex items-start gap-2.5">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: COMPANY DETAILS */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-2 border-b border-gray-50 pb-3">
              <Building className="w-4 h-4 text-[#D10056]" />
              Bedrijfsgegevens
            </h2>

            {/* Business Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Bedrijfsnaam
              </label>
              <input
                type="text"
                value={bedrijfsnaam}
                onChange={(e) => setBedrijfsnaam(e.target.value)}
                placeholder="Bedrijfsnaam"
                className="w-full artimar-input text-xs"
              />
            </div>

            {/* Contact Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Contactnummer / Telefoon
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={contactnummer}
                  onChange={(e) => setContactnummer(e.target.value)}
                  placeholder="Bijv. +32 12 34 56 78"
                  className="w-full pl-9 artimar-input text-xs"
                />
              </div>
            </div>

            {/* Delivery Opening Hours */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Openingsuren (voor leveringen)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={openingsuren}
                  onChange={(e) => setOpeningsuren(e.target.value)}
                  placeholder="Bijv. Ma-Vr: 08:00 - 17:00 (gesloten tussen 12:00-13:00)"
                  className="w-full pl-9 artimar-input text-xs"
                />
              </div>
              <p className="text-[10px] text-gray-400 font-medium">
                De uren waarbinnen leveringen van platen op uw werf of magazijn mogelijk zijn.
              </p>
            </div>
          </div>

          {/* SECURITY & CREDENTIALS CARD */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-2 border-b border-gray-50 pb-3">
              <Lock className="w-4 h-4 text-[#D10056]" />
              Inloggegevens & Beveiliging
            </h2>

            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                E-mailadres
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@bedrijf.be"
                  className="w-full pl-9 artimar-input text-xs"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Nieuw Wachtwoord
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Laat leeg om niet te wijzigen"
                className="w-full artimar-input text-xs"
              />
              <p className="text-[10px] text-gray-400 font-medium">Minimaal 6 tekens.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ADDRESSES */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-2 border-b border-gray-50 pb-3">
              <MapPin className="w-4 h-4 text-[#D10056]" />
              Leveringsadressen
            </h2>

            {/* Default Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Standaard Partneradres
              </label>
              <textarea
                value={standaardAdres}
                onChange={(e) => setStandaardAdres(e.target.value)}
                placeholder="Bijv. Industrielaan 10, 3700 Tongeren"
                className="w-full artimar-input h-20 text-xs resize-none"
              />
              <p className="text-[10px] text-gray-400 font-medium">
                Het hoofdadres waar uw bestellingen standaard naartoe gestuurd worden.
              </p>
            </div>

            {/* Other Addresses List */}
            <div className="space-y-3 pt-4 border-t border-gray-50">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Afwijkende afleveradressen / Werven ({andereAdressen.length})
              </label>

              {/* Add New Address input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAdresInput}
                  onChange={(e) => setNewAdresInput(e.target.value)}
                  placeholder="Voeg een werf- of afwijkend adres toe..."
                  className="flex-1 artimar-input text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddAddress}
                  className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Addresses list */}
              {andereAdressen.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">Nog geen andere adressen toegevoegd.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {andereAdressen.map((addr) => (
                    <div 
                      key={addr}
                      className="p-3 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-gray-700 break-words flex-1">{addr}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddress(addr)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-[#D10056] hover:bg-[#B00047] active:bg-[#90003A] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-md shadow-[#D10056]/10 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Opslaan...
            </>
          ) : (
            'Wijzigingen opslaan'
          )}
        </button>
      </div>
    </form>
  )
}
