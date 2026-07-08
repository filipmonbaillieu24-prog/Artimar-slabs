import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/shared/navbar'
import Footer from '@/components/shared/footer'

export const dynamic = 'force-dynamic'

export default async function PortaalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Fetch user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch profile details
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, role, bedrijfsnaam')
    .eq('id', user.id)
    .single()

  const userProfile = profile ? {
    email: profile.email,
    name: profile.bedrijfsnaam || profile.email.split('@')[0],
    role: profile.role,
  } : null

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      <Navbar initialProfile={userProfile} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  )
}
