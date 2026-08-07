export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TeamRole = "owner" | "captain" | "vice_captain" | "manager" | "member" | "viewer";
export type AvailabilityStatus = "full" | "partial" | "unknown";
export type AuctionStatus = "available" | "my_team" | "other_team";
export type AuctionLifecycle = "planning" | "live" | "completed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; full_name: string | null; display_name:string|null;preferred_name:string|null;phone:string|null;bio:string|null;profile_image_path:string|null;created_at: string; updated_at: string };
        Insert: { id: string; full_name?: string | null;display_name?:string|null;preferred_name?:string|null;phone?:string|null;bio?:string|null;profile_image_path?:string|null;created_at?: string; updated_at?: string };
        Update: { full_name?: string | null;display_name?:string|null;preferred_name?:string|null;phone?:string|null;bio?:string|null;profile_image_path?:string|null;updated_at?: string };
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
        Row: { id: string; team_id: string; bucket_id: string | null; name: string; role: string | null; priority: number | null; expected_price: number; availability_status: AvailabilityStatus; available_matches: number | null; availability_notes: string | null; notes: string | null; auction_status: AuctionStatus; sold_price: number; matches: number; batting_score: number; bowling_wickets: number; catches: number; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; bucket_id?: string | null; name: string; role?: string | null; priority?: number | null; expected_price?: number; availability_status?: AvailabilityStatus; available_matches?: number | null; availability_notes?: string | null; notes?: string | null; auction_status?: AuctionStatus; sold_price?: number; matches?: number; batting_score?: number; bowling_wickets?: number; catches?: number; created_at?: string; updated_at?: string };
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
      tournaments: { Row:{id:string;team_id:string;name:string;start_date:string;end_date:string|null;location:string|null;notes:string|null;maximum_match_squad_size:number;default_match_squad_size:number;is_active:boolean;created_at:string;updated_at:string}; Insert:{id?:string;team_id:string;name:string;start_date:string;end_date?:string|null;location?:string|null;notes?:string|null;maximum_match_squad_size?:number;default_match_squad_size?:number;is_active?:boolean;created_at?:string;updated_at?:string}; Update:Partial<Database["public"]["Tables"]["tournaments"]["Insert"]>; Relationships:[] };
      matches: { Row:{id:string;tournament_id:string;team_id:string;opponent_name:string;match_date:string;match_time:string|null;venue:string|null;round_name:string|null;match_number:number|null;squad_size:number|null;result:"scheduled"|"won"|"lost"|"draw"|"no_result"|"cancelled";team_score:string|null;opponent_score:string|null;result_notes:string|null;notes:string|null;created_at:string;updated_at:string}; Insert:{id?:string;tournament_id:string;team_id:string;opponent_name:string;match_date:string;match_time?:string|null;venue?:string|null;round_name?:string|null;match_number?:number|null;squad_size?:number|null;result?:"scheduled"|"won"|"lost"|"draw"|"no_result"|"cancelled";team_score?:string|null;opponent_score?:string|null;result_notes?:string|null;notes?:string|null;created_at?:string;updated_at?:string}; Update:Partial<Database["public"]["Tables"]["matches"]["Insert"]>; Relationships:[] };
      match_players: { Row:{id:string;match_id:string;player_id:string;team_id:string;selected:boolean;playing_status:"selected"|"playing"|"substitute"|"unavailable"|"not_selected";availability_override:"available"|"unavailable"|"unknown";batting_order:number|null;bowling_order:number|null;is_match_captain:boolean;is_wicketkeeper:boolean;notes:string|null;created_at:string;updated_at:string}; Insert:{id?:string;match_id:string;player_id:string;team_id:string;selected?:boolean;playing_status?:"selected"|"playing"|"substitute"|"unavailable"|"not_selected";availability_override?:"available"|"unavailable"|"unknown";batting_order?:number|null;bowling_order?:number|null;is_match_captain?:boolean;is_wicketkeeper?:boolean;notes?:string|null;created_at?:string;updated_at?:string}; Update:Partial<Database["public"]["Tables"]["match_players"]["Insert"]>; Relationships:[] };
      volunteer_duties:{Row:{id:string;team_id:string;match_id:string|null;duty_date:string;duty_time:string|null;duty_type:string;description:string|null;required_people:number;status:"open"|"assigned"|"completed"|"cancelled";created_at:string;updated_at:string};Insert:{id?:string;team_id:string;match_id?:string|null;duty_date:string;duty_time?:string|null;duty_type:string;description?:string|null;required_people?:number;status?:"open"|"assigned"|"completed"|"cancelled";created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["volunteer_duties"]["Insert"]>;Relationships:[]};
      volunteer_duty_assignments:{Row:{id:string;duty_id:string;team_id:string;player_id:string;notes:string|null;completed:boolean;created_at:string;updated_at:string};Insert:{id?:string;duty_id:string;team_id:string;player_id:string;notes?:string|null;completed?:boolean;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["volunteer_duty_assignments"]["Insert"]>;Relationships:[]};
      player_import_history:{Row:{id:string;team_id:string;bucket_id:string;imported_by:string;filename:string;total_rows:number;imported_rows:number;updated_rows:number;skipped_rows:number;failed_rows:number;created_at:string};Insert:{id?:string;team_id:string;bucket_id:string;imported_by:string;filename:string;total_rows:number;imported_rows?:number;updated_rows?:number;skipped_rows?:number;failed_rows?:number;created_at?:string};Update:never;Relationships:[]};
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
      phase5_setup_status: { Args: Record<PropertyKey, never>; Returns: Json };
      phase6_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
      assign_volunteer:{Args:{p_team_id:string;p_duty_id:string;p_player_id:string;p_notes?:string|null;p_override?:boolean};Returns:Database["public"]["Tables"]["volunteer_duty_assignments"]["Row"]};
      phase7_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
      phase8_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
