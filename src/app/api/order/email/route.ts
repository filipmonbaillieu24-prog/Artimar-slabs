import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is verplicht.' }, { status: 400 })
    }

    const mailchimpApiKey = process.env.MAILCHIMP_TRANSACTIONAL_API_KEY
    if (!mailchimpApiKey) {
      console.warn('MAILCHIMP_TRANSACTIONAL_API_KEY is niet ingesteld. E-mailverzending is overgeslagen.')
      return NextResponse.json({ 
        success: true, 
        warning: 'Mailchimp API key is niet geconfigureerd.' 
      })
    }

    const supabase = await createClient()

    // 1. Fetch order details with joined order_items and materials
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        referentie,
        levering_methode,
        levering_adres,
        opmerkingen,
        created_at,
        profiles (
          bedrijfsnaam,
          email,
          contactnummer
        ),
        order_items (
          aantal,
          lengte_mm,
          breedte_mm,
          materials (
            kleur,
            code,
            merk,
            dikte_mm,
            afwerking
          )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error(orderError?.message || 'Bestelling niet gevonden.')
    }

    const profile = order.profiles as any
    const items = (order.order_items || []) as any[]

    // 2. Format order items into HTML table rows
    const formattedItemsHtml = items
      .map((item) => {
        const mat = item.materials
        const nameAndCode = mat ? `${mat.kleur} (${mat.code})` : 'Onbekend'
        const specs = mat ? `${mat.merk} • ${mat.dikte_mm}mm • ${mat.afwerking}` : '-'
        const size = item.lengte_mm && item.breedte_mm 
          ? `${item.lengte_mm} x ${item.breedte_mm} mm` 
          : 'Volledige plaat'
        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px; font-weight: bold; color: #333;">${nameAndCode}</td>
            <td style="padding: 12px; color: #666;">${specs}</td>
            <td style="padding: 12px; color: #666;">${size}</td>
            <td style="padding: 12px; font-weight: bold; color: #D10056; text-align: right;">${item.aantal} st.</td>
          </tr>
        `
      })
      .join('')

    const totalPlates = items.reduce((acc, item) => acc + item.aantal, 0)

    const leveringLabel =
      order.levering_methode === 'standaard' ? 'Standaard Levering' :
      order.levering_methode === 'ander' ? 'Afwijkend Leveringsadres' :
      order.levering_methode === 'ophalen' ? 'Ophalen bij Artimar' : '-'

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
        <div style="background-color: #D10056; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">Nieuwe Platenbestelling</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px;">Bestelling #${order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        
        <div style="padding: 24px; background-color: #fff;">
          <h2 style="font-size: 14px; color: #888; text-transform: uppercase; border-bottom: 2px solid #f5f5f5; padding-bottom: 8px; margin-top: 0;">Klantgegevens</h2>
          <table style="width: 100%; font-size: 13px; margin-bottom: 24px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666; width: 140px; font-weight: bold;">Bedrijfsnaam:</td>
              <td style="padding: 6px 0; color: #333; font-weight: bold;">${profile?.bedrijfsnaam || 'Onbekend'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-weight: bold;">E-mailadres:</td>
              <td style="padding: 6px 0; color: #333;">${profile?.email || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-weight: bold;">Contactnummer:</td>
              <td style="padding: 6px 0; color: #333;">${profile?.contactnummer || '-'}</td>
            </tr>
          </table>

          <h2 style="font-size: 14px; color: #888; text-transform: uppercase; border-bottom: 2px solid #f5f5f5; padding-bottom: 8px;">Bestelling Details</h2>
          <table style="width: 100%; font-size: 13px; margin-bottom: 24px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #666; width: 140px; font-weight: bold;">Referentie:</td>
              <td style="padding: 6px 0; color: #D10056; font-weight: bold;">${order.referentie || 'Geen'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-weight: bold;">Leveringsmethode:</td>
              <td style="padding: 6px 0; color: #333; font-weight: bold;">${leveringLabel}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-weight: bold;">Afleveradres:</td>
              <td style="padding: 6px 0; color: #333; line-height: 1.4;">${order.levering_adres || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #666; font-weight: bold;">Opmerkingen:</td>
              <td style="padding: 6px 0; color: #666; font-style: italic;">${order.opmerkingen || 'Geen'}</td>
            </tr>
          </table>

          <h2 style="font-size: 14px; color: #888; text-transform: uppercase; border-bottom: 2px solid #f5f5f5; padding-bottom: 8px;">Bestelde Materialen</h2>
          <table style="width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 12px;">
            <thead>
              <tr style="background-color: #fcfcfc; border-bottom: 2px solid #eee; text-align: left; color: #888;">
                <th style="padding: 10px 12px; font-weight: bold;">Materiaal</th>
                <th style="padding: 10px 12px; font-weight: bold;">Specificaties</th>
                <th style="padding: 10px 12px; font-weight: bold;">Afmeting</th>
                <th style="padding: 10px 12px; font-weight: bold; text-align: right;">Aantal</th>
              </tr>
            </thead>
            <tbody>
              ${formattedItemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right; padding-top: 12px; border-top: 2px solid #f5f5f5;">
            <span style="font-size: 13px; color: #666; font-weight: bold; margin-right: 12px;">Totaal aantal platen:</span>
            <span style="font-size: 16px; color: #D10056; font-weight: 900;">${totalPlates} platen</span>
          </div>
        </div>

        <div style="background-color: #fafafa; padding: 16px; border-top: 1px solid #eee; text-align: center; border-radius: 0 0 8px 8px; font-size: 11px; color: #999;">
          Dit is een automatisch gegenereerd bericht vanuit het Artimar Bestelportaal.
        </div>
      </div>
    `

    const fromEmail = process.env.EMAIL_FROM || 'bestellingen@artimar.be'
    const toEmail = process.env.EMAIL_TO || 'bestellingen@artimar.be'
    const subject = `Nieuwe bestelling #${order.id.slice(0, 8).toUpperCase()} - ${profile?.bedrijfsnaam || 'Klant'}`

    // Send via Mailchimp Transactional (Mandrill) REST API
    const response = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: mailchimpApiKey,
        message: {
          html: emailHtml,
          subject: subject,
          from_email: fromEmail,
          from_name: 'Artimar Portaal',
          to: [{ email: toEmail, type: 'to' }]
        }
      })
    })

    const data = await response.json()

    // Mandrill returns an array on success: [{ status: 'sent', _id: '...' }]
    // or a single error object: { status: 'error', message: '...' }
    if (!response.ok || data.status === 'error') {
      const errMsg = data.message || 'Mailchimp verzending mislukt.'
      console.error('Mailchimp API Error:', JSON.stringify(data, null, 2))
      throw new Error(`Mailchimp Error: ${errMsg}`)
    }

    if (Array.isArray(data) && data[0]?.status === 'rejected') {
      const errMsg = data[0]?.reject_reason || 'Mailchimp bericht geweigerd.'
      console.error('Mailchimp rejected email:', JSON.stringify(data, null, 2))
      throw new Error(`Mailchimp rejected: ${errMsg}`)
    }

    console.log('Mailchimp email sent successfully:', JSON.stringify(data, null, 2))
    return NextResponse.json({ success: true, messageId: data[0]?._id || null })

  } catch (error: any) {
    console.error('Fout bij verzenden bestelling e-mail:', error)
    return NextResponse.json({ error: error.message || 'Interne serverfout' }, { status: 500 })
  }
}
