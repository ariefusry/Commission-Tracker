
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "addons": {
                  Row: {
                    "id": string,"is_active": boolean,"name": string,"price": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_active"?: boolean,"name": string,"price"?: number,"user_id"?: string
                  }
                  Update: {
                    "id"?: string,"is_active"?: boolean,"name"?: string,"price"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"commission_addons": {
                  Row: {
                    "addon_id": string | null,"commission_id": string,"custom_name": string | null,"id": string,"price": number
                  }
                  ComputedFields: never
                  Insert: {
                    "addon_id"?: string | null,"commission_id": string,"custom_name"?: string | null,"id"?: string,"price"?: number
                  }
                  Update: {
                    "addon_id"?: string | null,"commission_id"?: string,"custom_name"?: string | null,"id"?: string,"price"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "commission_addons_addon_id_fkey"
      columns: ["addon_id"]
isOneToOne: false
      referencedRelation: "addons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commission_addons_commission_id_fkey"
      columns: ["commission_id"]
isOneToOne: false
      referencedRelation: "commissions"
      referencedColumns: ["id"]
    }
                  ]
                },"commission_types": {
                  Row: {
                    "base_price": number,"id": string,"is_active": boolean,"name": string,"sort_order": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price"?: number,"id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number,"user_id"?: string
                  }
                  Update: {
                    "base_price"?: number,"id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"commissions": {
                  Row: {
                    "base_price": number,"client_username": string,"completed_at": string | null,"contact_handle": string | null,"contact_platform": string | null,"created_at": string,"deadline": string | null,"dp_amount": number,"id": string,"notes": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"price_override": number | null,"price_total": number,"queue_order": number,"reference_links": (string)[],"revision_count": number,"stage_id": string,"start_date": string,"status": Database["public"]['Enums']["commission_status"],"tracking_code": string,"type_custom": string | null,"type_id": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_price"?: number,"client_username": string,"completed_at"?: string | null,"contact_handle"?: string | null,"contact_platform"?: string | null,"created_at"?: string,"deadline"?: string | null,"dp_amount"?: number,"id"?: string,"notes"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"price_override"?: number | null,"price_total"?: number,"queue_order": number,"reference_links"?: (string)[],"revision_count"?: number,"stage_id": string,"start_date"?: string,"status"?: Database["public"]['Enums']["commission_status"],"tracking_code"?: string,"type_custom"?: string | null,"type_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "base_price"?: number,"client_username"?: string,"completed_at"?: string | null,"contact_handle"?: string | null,"contact_platform"?: string | null,"created_at"?: string,"deadline"?: string | null,"dp_amount"?: number,"id"?: string,"notes"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"price_override"?: number | null,"price_total"?: number,"queue_order"?: number,"reference_links"?: (string)[],"revision_count"?: number,"stage_id"?: string,"start_date"?: string,"status"?: Database["public"]['Enums']["commission_status"],"tracking_code"?: string,"type_custom"?: string | null,"type_id"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "commissions_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "commissions_type_id_fkey"
      columns: ["type_id"]
isOneToOne: false
      referencedRelation: "commission_types"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "count_cancelled_paid": boolean,"display_name": string | null,"is_open": boolean,"show_queue": boolean,"slot_limit": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count_cancelled_paid"?: boolean,"display_name"?: string | null,"is_open"?: boolean,"show_queue"?: boolean,"slot_limit"?: number,"user_id"?: string
                  }
                  Update: {
                    "count_cancelled_paid"?: boolean,"display_name"?: string | null,"is_open"?: boolean,"show_queue"?: boolean,"slot_limit"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"stages": {
                  Row: {
                    "id": string,"is_active": boolean,"name": string,"sort_order": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_active"?: boolean,"name": string,"sort_order"?: number,"user_id"?: string
                  }
                  Update: {
                    "id"?: string,"is_active"?: boolean,"name"?: string,"sort_order"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"subscriptions": {
                  Row: {
                    "active_until": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_until"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "active_until"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wip_images": {
                  Row: {
                    "commission_id": string,"created_at": string,"id": string,"stage_id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "commission_id": string,"created_at"?: string,"id"?: string,"stage_id": string,"storage_path": string
                  }
                  Update: {
                    "commission_id"?: string,"created_at"?: string,"id"?: string,"stage_id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wip_images_commission_id_fkey"
      columns: ["commission_id"]
isOneToOne: false
      referencedRelation: "commissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wip_images_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "stages"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "get_tracking":
{ Args: { "p_code": string }; Returns: {
              "artist_name": string,"client_username": string,"current_stage": number,"deadline": string,"queue": Json,"queue_position": number,"queue_total": number,"recent_completions": (string)[],"slot_limit": number,"stages": (string)[],"start_date": string,"status": Database["public"]['Enums']["commission_status"],"type_name": string,"updated_at": string,"wait_position": number,"wait_total": number
            }[]
                           },
"has_access":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"save_commission":
{ Args: { "p_addons": Json,"p_data": Json,"p_id"?: string }; Returns: string
                           }
          }
          Enums: {
            "commission_status": "queue"|"in_progress"|"revision"|"done"|"cancelled","payment_status": "unpaid"|"dp"|"paid"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "commission_status": ["queue", "in_progress", "revision", "done", "cancelled"],"payment_status": ["unpaid", "dp", "paid"]
          }
        }
} as const
