export type UserRole = 'klant' | 'admin'

export type OrderStatus =
  | 'bestelling doorgestuurd'
  | 'bestelling ontvangen'
  | 'materiaal voorradig'
  | 'materiaal niet voorradig'
  | 'bestelling ingepland voor levering'

export interface Profile {
  id: string
  email: string
  bedrijfsnaam: string | null
  role: UserRole
  created_at: string
  standaard_adres: string | null
  andere_adressen: string[] | null
  contactnummer: string | null
  openingsuren: string | null
}

export interface Material {
  id: string
  merk: string
  code: string
  kleur: string
  afwerking: string
  dikte_mm: number
  created_at: string
}

export interface Order {
  id: string
  klant_id: string
  status: OrderStatus
  verwachte_datum: string | null
  leverdatum: string | null
  opmerkingen: string | null
  referentie: string | null
  levering_methode: string | null
  levering_adres: string | null
  created_at: string
  updated_at: string
  profiles?: Profile
  order_items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  material_id: string
  lengte_mm: number
  breedte_mm: number
  aantal: number
  materials?: Material
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  changed_by: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  metadata: {
    verwachte_datum?: string | null
    leverdatum?: string | null
    [key: string]: any
  } | null
  changed_at: string
  profiles?: Profile
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Omit<Profile, 'id'>>
      }
      materials: {
        Row: Material
        Insert: Omit<Material, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Material, 'id'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'status'> & {
          id?: string
          status?: OrderStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Order, 'id' | 'klant_id'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id'> & { id?: string }
        Update: Partial<Omit<OrderItem, 'id'>>
      }
      order_status_history: {
        Row: OrderStatusHistory
        Insert: Omit<OrderStatusHistory, 'id' | 'changed_at'> & { id?: string; changed_at?: string }
        Update: Partial<Omit<OrderStatusHistory, 'id'>>
      }
    }
  }
}
