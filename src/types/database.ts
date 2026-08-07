export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TeamRole = "owner" | "captain" | "vice_captain" | "manager" | "member" | "viewer";
export type AvailabilityStatus = "full" | "partial" | "unknown";
export type AuctionStatus = "available" | "my_team" | "other_team";
export type AuctionLifecycle = "planning" | "live" | "completed";

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
          auction_status: AuctionLifecycle;
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
          auction_status?: AuctionLifecycle;
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
      auction_buckets: {
        Row: { id: string; team_id: string; name: string; description: string | null; minimum_players: number; maximum_players: number | null; planned_budget: number; display_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; name: string; description?: string | null; minimum_players?: number; maximum_players?: number | null; planned_budget?: number; display_order?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["auction_buckets"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: { id: string; team_id: string; bucket_id: string | null; name: string; role: string | null; priority: number | null; expected_price: number; availability_status: AvailabilityStatus; available_matches: number | null; availability_notes: string | null; notes: string | null; auction_status: AuctionStatus; sold_price: number; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; bucket_id?: string | null; name: string; role?: string | null; priority?: number | null; expected_price?: number; availability_status?: AvailabilityStatus; available_matches?: number | null; availability_notes?: string | null; notes?: string | null; auction_status?: AuctionStatus; sold_price?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      probable_teams: {
        Row: { id: string; team_id: string; plan_label: "A" | "B" | "C"; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; plan_label: "A" | "B" | "C"; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["probable_teams"]["Insert"]>;
        Relationships: [];
      };
      probable_team_players: {
        Row: { id: string; team_id: string; probable_team_id: string; player_id: string; display_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; probable_team_id: string; player_id: string; display_order?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["probable_team_players"]["Insert"]>;
        Relationships: [];
      };
      auction_history: {
        Row: { id: string; team_id: string; player_id: string; action: "sold_to_my_team" | "sold_to_other_team" | "undo" | "bucket_max_override"; previous_status: AuctionStatus | null; new_status: AuctionStatus | null; previous_price: number | null; new_price: number | null; performed_by: string; created_at: string };
        Insert: { id?: string; team_id: string; player_id: string; action: "sold_to_my_team" | "sold_to_other_team" | "undo" | "bucket_max_override"; previous_status?: AuctionStatus | null; new_status?: AuctionStatus | null; previous_price?: number | null; new_price?: number | null; performed_by: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      auction_lifecycle_history: {
        Row: { id: string; team_id: string; previous_status: AuctionLifecycle; new_status: AuctionLifecycle; performed_by: string; created_at: string };
        Insert: { id?: string; team_id: string; previous_status: AuctionLifecycle; new_status: AuctionLifecycle; performed_by: string; created_at?: string };
        Update: never;
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
      phase3_setup_status: { Args: Record<PropertyKey, never>; Returns: Json };
      phase4_setup_status: { Args: Record<PropertyKey, never>; Returns: Json };
      update_player_auction_status: {
        Args: { p_team_id: string; p_player_id: string; p_expected_status: AuctionStatus; p_new_status: AuctionStatus; p_sold_price?: number; p_override_squad_limit?: boolean; p_override_bucket_max?: boolean };
        Returns: Database["public"]["Tables"]["players"]["Row"];
      };
      update_auction_lifecycle: { Args: { p_team_id: string; p_expected_status: AuctionLifecycle; p_new_status: AuctionLifecycle }; Returns: AuctionLifecycle };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
