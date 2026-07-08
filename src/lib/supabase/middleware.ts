import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. Get the authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // 2. Check auth requirements
  if (path.startsWith('/portaal')) {
    if (!user) {
      // Not logged in, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check role from metadata first, fallback to database query
    let role = user.user_metadata?.role || user.app_metadata?.role

    if (!role) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Middleware profile fetch error:', profileError)
      }
      role = profile?.role
    }

    // Safety fallback: if no role is found, redirect to login
    if (!role) {
      console.warn('No role found for user, redirecting to /login')
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Clear cookies by returning a response that deletes them or just redirecting
      return NextResponse.redirect(url)
    }

    // Redirect to respective portal if trying to access the wrong area
    if (path.startsWith('/portaal/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/portaal/klant'
      return NextResponse.redirect(url)
    }

    if (path.startsWith('/portaal/klant') && role !== 'klant') {
      const url = request.nextUrl.clone()
      url.pathname = '/portaal/admin'
      return NextResponse.redirect(url)
    }
  }

  // 3. If logged in and hitting login or landing page, redirect to respective dashboard
  if ((path === '/' || path === '/login') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const url = request.nextUrl.clone()
    if (role === 'admin') {
      url.pathname = '/portaal/admin'
    } else {
      url.pathname = '/portaal/klant'
    }
    return NextResponse.redirect(url)
  }

  // 4. If not logged in and hitting root page /, redirect to /login
  if (path === '/' && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}
