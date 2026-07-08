import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

export const runtime = 'nodejs'

// Define PDF styles using standard Helvetica font
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    color: '#333333',
    lineHeight: 1.5,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 20,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: '#D10056',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  logoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#111111',
  },
  logoSubtitle: {
    fontSize: 6,
    letterSpacing: 2,
    color: '#888888',
    marginTop: 2,
  },
  companyDetails: {
    alignItems: 'flex-end',
    fontSize: 8,
    color: '#666666',
  },
  titleContainer: {
    marginBottom: 25,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111111',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#FBFBFB',
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  metaBlock: {
    width: '45%',
  },
  metaLabel: {
    fontSize: 8,
    color: '#888888',
    textTransform: 'uppercase',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111111',
  },
  table: {
    width: '100%',
    marginBottom: 40,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#D10056',
    paddingBottom: 8,
    marginBottom: 8,
    fontWeight: 'bold',
    color: '#888888',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  colQty: { width: '10%', textAlign: 'center', fontWeight: 'bold' },
  colMaterial: { width: '35%' },
  colFinish: { width: '25%' },
  colThick: { width: '12%', textAlign: 'center' },
  colDim: { width: '18%', textAlign: 'right' },
  signatureSection: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 20,
  },
  signatureTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#666666',
    marginBottom: 40,
  },
  signatureLines: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#999999',
    width: '45%',
    paddingTop: 5,
    fontSize: 8,
    color: '#888888',
  },
})

// Define the PDF template Document
interface PDFProps {
  order: any
  client: any
  items: any[]
}

const LeverbonDocument = ({ order, client, items }: PDFProps) => {
  const formattedDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Block */}
        <View style={styles.headerContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>a</Text>
            </View>
            <View>
              <Text style={styles.logoTitle}>artimar</Text>
              <Text style={styles.logoSubtitle}>PASSION FOR STONE</Text>
            </View>
          </View>
          <View style={styles.companyDetails}>
            <Text>Artimar NV</Text>
            <Text>Luikersteenweg 218, 3700 Tongeren, België</Text>
            <Text>info@artimar.be | +32 12 24 23 40</Text>
            <Text>BTW BE 0451.984.712</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>LEVERBON / DELIVERY NOTE</Text>
        </View>

        {/* Metadata info cards */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Klant & Adres</Text>
            <Text style={styles.metaValue}>{client?.bedrijfsnaam || 'Klant'}</Text>
            <Text style={{ fontSize: 9, color: '#666666', marginTop: 2 }}>{client?.email}</Text>
            {order.levering_methode && (
              <Text style={{ fontSize: 8, color: '#666666', marginTop: 6, fontWeight: 'bold' }}>
                Methode: {order.levering_methode === 'standaard' ? 'Standaard Partneradres' : (order.levering_methode === 'ophalen' ? 'Zelf Afhalen' : 'Afwijkend Adres')}
              </Text>
            )}
            {order.levering_methode === 'ander' && order.levering_adres && (
              <Text style={{ fontSize: 8, color: '#444444', marginTop: 2 }}>
                {order.levering_adres}
              </Text>
            )}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bestelling Info</Text>
            <Text style={styles.metaValue}>Bon nr: #{order.id.slice(0, 8).toUpperCase()}</Text>
            {order.referentie && (
              <Text style={{ fontSize: 9, color: '#D10056', fontWeight: 'bold', marginTop: 2 }}>
                Ref: {order.referentie}
              </Text>
            )}
            <Text style={{ fontSize: 9, color: '#666666', marginTop: 2 }}>
              Leverdatum: {formattedDate(order.leverdatum)}
            </Text>
            <Text style={{ fontSize: 8, color: '#888888', marginTop: 2 }}>
              Besteldatum: {formattedDate(order.created_at)}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colQty}>Aantal</Text>
            <Text style={styles.colMaterial}>Merk & Code</Text>
            <Text style={styles.colFinish}>Kleur & Afwerking</Text>
            <Text style={styles.colThick}>Dikte</Text>
            <Text style={styles.colDim}>Afmeting (mm)</Text>
          </View>

          {items.map((item, index) => {
            const mat = item.materials
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.colQty}>{item.aantal}x</Text>
                <Text style={styles.colMaterial}>{mat ? `${mat.merk} - ${mat.code}` : 'Onbekend'}</Text>
                <Text style={styles.colFinish}>{mat ? `${mat.kleur} (${mat.afwerking})` : 'Onbekend'}</Text>
                <Text style={styles.colThick}>{mat ? `${mat.dikte_mm} mm` : '-'}</Text>
                <Text style={styles.colDim}>
                  {item.lengte_mm && item.breedte_mm 
                    ? `${item.lengte_mm}x${item.breedte_mm}` 
                    : 'Volledige plaat'
                  }
                </Text>
              </View>
            )
          })}
        </View>

        {/* Remarks if any */}
        {order.opmerkingen && (
          <View style={{ marginBottom: 40 }}>
            <Text style={{ fontSize: 8, color: '#888888', textTransform: 'uppercase', marginBottom: 4, fontWeight: 'bold' }}>
              Opmerkingen / Speciale instructies:
            </Text>
            <Text style={{ fontSize: 9, color: '#444444', fontStyle: 'italic' }}>
              {order.opmerkingen}
            </Text>
          </View>
        )}

        {/* Signature box */}
        <View style={styles.signatureSection}>
          <Text style={styles.signatureTitle}>Handtekening voor goede ontvangst:</Text>
          <View style={styles.signatureLines}>
            <Text style={styles.signatureLine}>Datum: ____-____-________</Text>
            <Text style={styles.signatureLine}>Handtekening (en naam):</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is verplicht' }, { status: 400 })
    }

    // Verify session
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 })
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profiel niet gevonden' }, { status: 403 })
    }

    // Fetch order details
    const { data: order } = await supabase
      .from('orders')
      .select(`
        *,
        profiles (
          id,
          email,
          bedrijfsnaam
        ),
        order_items (
          *,
          materials (*)
        )
      `)
      .eq('id', orderId)
      .single()

    if (!order) {
      return NextResponse.json({ error: 'Bestelling niet gevonden' }, { status: 404 })
    }

    // Check auth guards (Client can only download their own, admin can download all)
    if (profile.role !== 'admin' && order.klant_id !== user.id) {
      return NextResponse.json({ error: 'Niet geautoriseerd om deze bon te downloaden' }, { status: 403 })
    }

    // Check status check
    if (order.status !== 'bestelling ingepland voor levering') {
      return NextResponse.json(
        { error: 'Leverbon kan pas gedownload worden zodra de levering is ingepland' },
        { status: 400 }
      )
    }

    // Render PDF to buffer
    const doc = React.createElement(LeverbonDocument, {
      order: order,
      client: order.profiles,
      items: order.order_items || [],
    })

    const buffer = await renderToBuffer(doc as any)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="leverbon-${orderId.slice(0, 8).toUpperCase()}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('PDF Generation Error:', err)
    return NextResponse.json({ error: 'Fout bij genereren van PDF: ' + err.message }, { status: 500 })
  }
}
