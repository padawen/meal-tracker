export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    is_admin: boolean
                    is_approved: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    is_admin?: boolean
                    is_approved?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    is_admin?: boolean
                    is_approved?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            meal_records: {
                Row: {
                    id: string
                    date: string
                    had_meal: boolean
                    meal_name: string | null
                    reason: string | null
                    recorded_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    date: string
                    had_meal: boolean
                    meal_name?: string | null
                    reason?: string | null
                    recorded_by: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    had_meal?: boolean
                    meal_name?: string | null
                    reason?: string | null
                    recorded_by?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "meal_records_recorded_by_fkey"
                        columns: ["recorded_by"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {}
        Functions: {}
        Enums: {}
        CompositeTypes: {}
    }
}