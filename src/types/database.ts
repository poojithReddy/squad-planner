export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TeamRole = "owner" | "captain" | "vice_captain" | "manager" | "member" | "viewer";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Update: { full_name?: string | null; updated_at?: string };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          primary_colour: string | null;
          secondary_colour: string | null;
          captain_name: string;
          vice_captain_name: string | null;
          manager_name: string | null;
          squad_size: number;
          total_auction_budget: number;
          logo_url: string | null;
          banner_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          primary_colour?: string | null;
          secondary_colour?: string | null;
          captain_name: string;
          vice_captain_name?: string | null;
          manager_name?: string | null;
          squad_size: number;
          total_auction_budget?: number;
          logo_url?: string | null;
          banner_url?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      team_members: {
        Row: { id: string; team_id: string; user_id: string; role: TeamRole; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; user_id: string; role?: TeamRole; created_at?: string; updated_at?: string };
        Update: { role?: TeamRole; updated_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      app_setup_status: { Args: Record<PropertyKey, never>; Returns: Json };
      create_team: {
        Args: {
          p_name: string;
          p_primary_colour: string;
          p_captain_name: string;
          p_vice_captain_name: string | null;
          p_manager_name: string | null;
          p_squad_size: number;
          p_total_auction_budget: number;
          p_secondary_colour?: string | null;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
