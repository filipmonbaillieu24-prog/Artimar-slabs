import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#111111] text-gray-400 py-12 px-8 border-t border-neutral-900 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Logo and About */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-[#D10056] rounded-md flex items-center justify-center shadow-sm">
              <svg viewBox="0 0 100 100" className="w-8 h-8 text-white fill-current">
                <path d="M75,55 C75,65 65,75 50,75 C30,75 25,58 25,48 C25,32 38,25 50,25 C62,25 70,30 72,40 L73,43 C70,33 60,30 50,30 C35,30 31,42 31,48 C31,55 35,68 50,68 C62,68 68,60 69,53 L75,55 Z" />
                <path d="M68,48 L74,48 L74,75 L68,75 L68,48 Z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white leading-none uppercase">
                artimar
              </span>
              <span className="text-[8.5px] font-bold text-gray-500 tracking-[0.16em] leading-none mt-1">
                PASSION FOR STONE
              </span>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Artimar NV is uw specialist in natuursteen, composiet en keramiek maatwerk.
          </p>
        </div>

        {/* Snelle Links */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
            Snelle Links
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="https://artimar.be" className="hover:text-white transition-colors">
                Home
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Configurator
              </a>
            </li>
            <li>
              <a href="/login" className="hover:text-white transition-colors">
                B2B Login
              </a>
            </li>
          </ul>
        </div>

        {/* Contact info */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
            Contact
          </h4>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#D10056]" />
              <a href="mailto:info@artimar.be" className="hover:text-white transition-colors">
                info@artimar.be
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#D10056]" />
              <a href="tel:+3212242340" className="hover:text-white transition-colors">
                +32 12 24 23 40
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#D10056] mt-0.5 shrink-0" />
              <span>
                Luikersteenweg 218
                <br />
                3700 Tongeren, België
              </span>
            </li>
          </ul>
        </div>

        {/* Juridisch */}
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
            Juridisch
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Verkoopsvoorwaarden
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white transition-colors">
                Oversteek richtlijnen
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-neutral-900 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-neutral-600">
        <p>&copy; {new Date().getFullYear()} Artimar. Alle rechten voorbehouden.</p>
        <p className="mt-2 md:mt-0">Ontwikkeld voor Artimar Partners.</p>
      </div>
    </footer>
  )
}
