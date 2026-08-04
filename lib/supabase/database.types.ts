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
                    meal_image_url: string | null
                    reason: string | null
                    recorded_by: string
                    team: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    date: string
                    had_meal: boolean
                    meal_name?: string | null
                    meal_image_url?: string | null
                    reason?: string | null
                    recorded_by: string
                    team?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    had_meal?: boolean
                    meal_name?: string | null
                    meal_image_url?: string | null
                    reason?: string | null
                    recorded_by?: string
                    team?: string | null
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
            meal_ratings: {
                Row: {
                    id: string
                    meal_record_id: string
                    user_id: string
                    rating: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    meal_record_id: string
                    user_id: string
                    rating: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    meal_record_id?: string
                    user_id?: string
                    rating?: number
                    created_at?: string
                }
                Relationships: []
            }
            holidays: {
                Row: {
                    id: string
                    date: string
                    name: string
                    description: string | null
                    created_by: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    date: string
                    name: string
                    description?: string | null
                    created_by: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    name?: string
                    description?: string | null
                    created_by?: string
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "holidays_created_by_fkey"
                        columns: ["created_by"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {}
        Functions: {
            get_meal_rating_summaries: {
                Args: { p_start_date: string; p_end_date: string }
                Returns: {
                    meal_record_id: string
                    meal_date: string
                    rating_sum: number
                    rating_count: number
                    rating_average: number | null
                    my_rating: number | null
                }[]
            }
        }
        Enums: {}
        CompositeTypes: {}
    }
}
