export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      listing_translations: {
        Row: {
          created_at: string
          description: string | null
          listing_id: string
          locale: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          listing_id: string
          locale: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          listing_id?: string
          locale?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_translations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_virtual_tours: {
        Row: {
          created_at: string
          entry_scene_id: string | null
          id: string
          listing_id: string
          status: Database["public"]["Enums"]["virtual_tour_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_scene_id?: string | null
          id?: string
          listing_id: string
          status?: Database["public"]["Enums"]["virtual_tour_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_scene_id?: string | null
          id?: string
          listing_id?: string
          status?: Database["public"]["Enums"]["virtual_tour_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_virtual_tours_entry_scene_fkey"
            columns: ["entry_scene_id"]
            isOneToOne: false
            referencedRelation: "virtual_tour_scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_virtual_tours_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          amenities: Database["public"]["Enums"]["amenity"][]
          area: number | null
          available_from: string | null
          base_locale: string
          baths: number
          beds: number
          city: string
          created_at: string
          deposit: Database["public"]["Enums"]["deposit_type"] | null
          deposit_amount: number | null
          description: string
          district: Database["public"]["Enums"]["district"]
          has_virtual_tour: boolean
          id: string
          images: string[]
          lat: number | null
          lng: number | null
          min_lease_months: number | null
          owner_id: string
          palette: number
          price: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at: string
          util_building: Database["public"]["Enums"]["utility_billing"] | null
          util_building_amount: number | null
          util_electricity:
            | Database["public"]["Enums"]["utility_billing"]
            | null
          util_electricity_amount: number | null
          util_water: Database["public"]["Enums"]["utility_billing"] | null
          util_water_amount: number | null
          util_wifi: Database["public"]["Enums"]["utility_billing"] | null
          util_wifi_amount: number | null
          views: number
        }
        Insert: {
          amenities?: Database["public"]["Enums"]["amenity"][]
          area?: number | null
          available_from?: string | null
          base_locale?: string
          baths?: number
          beds?: number
          city?: string
          created_at?: string
          deposit?: Database["public"]["Enums"]["deposit_type"] | null
          deposit_amount?: number | null
          description?: string
          district: Database["public"]["Enums"]["district"]
          has_virtual_tour?: boolean
          id?: string
          images?: string[]
          lat?: number | null
          lng?: number | null
          min_lease_months?: number | null
          owner_id: string
          palette?: number
          price: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          type: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          util_building?: Database["public"]["Enums"]["utility_billing"] | null
          util_building_amount?: number | null
          util_electricity?:
            | Database["public"]["Enums"]["utility_billing"]
            | null
          util_electricity_amount?: number | null
          util_water?: Database["public"]["Enums"]["utility_billing"] | null
          util_water_amount?: number | null
          util_wifi?: Database["public"]["Enums"]["utility_billing"] | null
          util_wifi_amount?: number | null
          views?: number
        }
        Update: {
          amenities?: Database["public"]["Enums"]["amenity"][]
          area?: number | null
          available_from?: string | null
          base_locale?: string
          baths?: number
          beds?: number
          city?: string
          created_at?: string
          deposit?: Database["public"]["Enums"]["deposit_type"] | null
          deposit_amount?: number | null
          description?: string
          district?: Database["public"]["Enums"]["district"]
          has_virtual_tour?: boolean
          id?: string
          images?: string[]
          lat?: number | null
          lng?: number | null
          min_lease_months?: number | null
          owner_id?: string
          palette?: number
          price?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          type?: Database["public"]["Enums"]["listing_type"]
          updated_at?: string
          util_building?: Database["public"]["Enums"]["utility_billing"] | null
          util_building_amount?: number | null
          util_electricity?:
            | Database["public"]["Enums"]["utility_billing"]
            | null
          util_electricity_amount?: number | null
          util_water?: Database["public"]["Enums"]["utility_billing"] | null
          util_water_amount?: number | null
          util_wifi?: Database["public"]["Enums"]["utility_billing"] | null
          util_wifi_amount?: number | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_availability: {
        Row: {
          owner_id: string
          time: string
          weekday: number
        }
        Insert: {
          owner_id: string
          time: string
          weekday: number
        }
        Update: {
          owner_id?: string
          time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "owner_availability_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          created_at: string
          languages: string[]
          profile_id: string
          response_rate: number | null
          response_time: string | null
          superhost: boolean
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          languages?: string[]
          profile_id: string
          response_rate?: number | null
          response_time?: string | null
          superhost?: boolean
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          languages?: string[]
          profile_id?: string
          response_rate?: number | null
          response_time?: string | null
          superhost?: boolean
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string
          created_at: string
          id: string
          name: string
          palette: number
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          bio?: string
          created_at?: string
          id: string
          name?: string
          palette?: number
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          bio?: string
          created_at?: string
          id?: string
          name?: string
          palette?: number
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          owner_id: string
          rating: number
          text: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          owner_id: string
          rating: number
          text: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          owner_id?: string
          rating?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_listings: {
        Row: {
          created_at: string
          listing_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_listings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search_notifications: {
        Row: {
          created_at: string
          listing_id: string
          saved_search_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          saved_search_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          saved_search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_notifications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_search_notifications_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alerts: boolean
          created_at: string
          id: string
          locale: string
          name: string
          profile_id: string
          query_string: string
        }
        Insert: {
          alerts?: boolean
          created_at?: string
          id?: string
          locale?: string
          name: string
          profile_id: string
          query_string: string
        }
        Update: {
          alerts?: boolean
          created_at?: string
          id?: string
          locale?: string
          name?: string
          profile_id?: string
          query_string?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          created_at: string
          date: string
          id: string
          listing_id: string
          move_in: string | null
          note: string
          owner_id: string
          people: string | null
          proposed_date: string | null
          proposed_time: string | null
          renter_email: string
          renter_id: string | null
          renter_name: string
          status: Database["public"]["Enums"]["tour_status"]
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          listing_id: string
          move_in?: string | null
          note?: string
          owner_id: string
          people?: string | null
          proposed_date?: string | null
          proposed_time?: string | null
          renter_email: string
          renter_id?: string | null
          renter_name: string
          status?: Database["public"]["Enums"]["tour_status"]
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          listing_id?: string
          move_in?: string | null
          note?: string
          owner_id?: string
          people?: string | null
          proposed_date?: string | null
          proposed_time?: string | null
          renter_email?: string
          renter_id?: string | null
          renter_name?: string
          status?: Database["public"]["Enums"]["tour_status"]
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tours_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_tour_scenes: {
        Row: {
          created_at: string
          hfov: number | null
          hotspots: Json
          id: string
          name: string
          panorama_url: string
          pitch: number
          plan_x: number | null
          plan_y: number | null
          preview_url: string | null
          room: Database["public"]["Enums"]["room_kind"]
          sort_order: number
          tour_id: string
          yaw: number
        }
        Insert: {
          created_at?: string
          hfov?: number | null
          hotspots?: Json
          id?: string
          name: string
          panorama_url: string
          pitch?: number
          plan_x?: number | null
          plan_y?: number | null
          preview_url?: string | null
          room?: Database["public"]["Enums"]["room_kind"]
          sort_order?: number
          tour_id: string
          yaw?: number
        }
        Update: {
          created_at?: string
          hfov?: number | null
          hotspots?: Json
          id?: string
          name?: string
          panorama_url?: string
          pitch?: number
          plan_x?: number | null
          plan_y?: number | null
          preview_url?: string | null
          room?: Database["public"]["Enums"]["room_kind"]
          sort_order?: number
          tour_id?: string
          yaw?: number
        }
        Relationships: [
          {
            foreignKeyName: "virtual_tour_scenes_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "listing_virtual_tours"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_orphaned_listing_photos: {
        Args: { min_age?: string }
        Returns: string[]
      }
      owner_review_stats: {
        Args: { owner: string }
        Returns: {
          avg: number
          dist: Json
          total: number
        }[]
      }
      replace_owner_availability: {
        Args: { slots: Json }
        Returns: undefined
      }
    }
    Enums: {
      amenity: "wifi" | "parking" | "pets" | "garden" | "ac" | "laundry"
      deposit_type: "none" | "1mo" | "2mo" | "custom"
      district:
        | "lien-chieu"
        | "hai-chau"
        | "cam-le"
        | "ngu-hanh-son"
        | "thanh-khe"
        | "son-tra"
      listing_status: "active" | "draft"
      listing_type: "studio" | "apartment" | "loft" | "townhouse" | "house"
      room_kind: "living" | "bed" | "bath" | "kitchen" | "balcony" | "other"
      tour_status: "pending" | "confirmed" | "declined" | "reschedule"
      user_role: "renter" | "owner"
      utility_billing: "included" | "metered" | "fixed"
      virtual_tour_status: "draft" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      amenity: ["wifi", "parking", "pets", "garden", "ac", "laundry"],
      deposit_type: ["none", "1mo", "2mo", "custom"],
      district: [
        "lien-chieu",
        "hai-chau",
        "cam-le",
        "ngu-hanh-son",
        "thanh-khe",
        "son-tra",
      ],
      listing_status: ["active", "draft"],
      listing_type: ["studio", "apartment", "loft", "townhouse", "house"],
      room_kind: ["living", "bed", "bath", "kitchen", "balcony", "other"],
      tour_status: ["pending", "confirmed", "declined", "reschedule"],
      user_role: ["renter", "owner"],
      utility_billing: ["included", "metered", "fixed"],
      virtual_tour_status: ["draft", "published"],
    },
  },
} as const
