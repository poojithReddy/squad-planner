export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type TeamRole = "owner" | "captain" | "vice_captain" | "manager" | "member" | "viewer";
export type TournamentRole = "tournament_admin" | "tournament_viewer";
export type PlatformRole = "super_admin";
export type TournamentLifecycle = "draft" | "setup" | "active" | "completed" | "archived";
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
          captain_name: string | null;
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
          tournament_id?: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          primary_colour?: string | null;
          secondary_colour?: string | null;
          captain_name?: string | null;
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
          tournament_id?: string | null;
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
      tournament_members:{Row:{id:string;tournament_id:string;user_id:string;role:TournamentRole;created_at:string;updated_at:string};Insert:{id?:string;tournament_id:string;user_id:string;role:TournamentRole;created_at?:string;updated_at?:string};Update:{role?:TournamentRole;updated_at?:string};Relationships:[]};
      platform_roles:{Row:{id:string;user_id:string;role:PlatformRole;created_at:string;updated_at:string};Insert:{id?:string;user_id:string;role:PlatformRole;created_at?:string;updated_at?:string};Update:{role?:PlatformRole;updated_at?:string};Relationships:[]};
      tournament_invitations:{Row:{id:string;tournament_id:string;email:string;full_name:string|null;tournament_role:TournamentRole;invited_by:string;status:"pending"|"accepted"|"cancelled";accepted_by:string|null;accepted_at:string|null;created_at:string;updated_at:string};Insert:{id?:string;tournament_id:string;email:string;full_name?:string|null;tournament_role:TournamentRole;invited_by:string;status?:"pending"|"accepted"|"cancelled";accepted_by?:string|null;accepted_at?:string|null;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["tournament_invitations"]["Insert"]>;Relationships:[]};
      team_invitations:{Row:{id:string;tournament_id:string;team_id:string;email:string;full_name:string|null;team_role:Exclude<TeamRole,"owner">;invited_by:string;status:"pending"|"accepted"|"cancelled";accepted_by:string|null;accepted_at:string|null;created_at:string;updated_at:string};Insert:{id?:string;tournament_id:string;team_id:string;email:string;full_name?:string|null;team_role:Exclude<TeamRole,"owner">;invited_by:string;status?:"pending"|"accepted"|"cancelled";accepted_by?:string|null;accepted_at?:string|null;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["team_invitations"]["Insert"]>;Relationships:[]};
      auction_buckets: {
        Row: { id: string; team_id: string; name: string; description: string | null; minimum_players: number; maximum_players: number | null; planned_budget: number; display_order: number; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string; name: string; description?: string | null; minimum_players?: number; maximum_players?: number | null; planned_budget?: number; display_order?: number; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["auction_buckets"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: { id: string; team_id: string; tournament_player_id?:string|null;bucket_id: string | null; name: string; role: string | null; priority: number | null; expected_price: number; availability_status: AvailabilityStatus; available_matches: number | null; availability_notes: string | null; notes: string | null; auction_status: AuctionStatus; sold_price: number; matches: number; batting_score: number; bowling_wickets: number; catches: number; created_at: string; updated_at: string };
        Insert: { id?: string; team_id: string;tournament_player_id?:string|null; bucket_id?: string | null; name: string; role?: string | null; priority?: number | null; expected_price?: number; availability_status?: AvailabilityStatus; available_matches?: number | null; availability_notes?: string | null; notes?: string | null; auction_status?: AuctionStatus; sold_price?: number; matches?: number; batting_score?: number; bowling_wickets?: number; catches?: number; created_at?: string; updated_at?: string };
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
      tournaments: { Row:{id:string;team_id:string|null;name:string;start_date:string;end_date:string|null;location:string|null;notes:string|null;maximum_match_squad_size:number;default_match_squad_size:number;is_active:boolean;status?:TournamentLifecycle;created_at:string;updated_at:string}; Insert:{id?:string;team_id?:string|null;name:string;start_date:string;end_date?:string|null;location?:string|null;notes?:string|null;maximum_match_squad_size?:number;default_match_squad_size?:number;is_active?:boolean;status?:TournamentLifecycle;created_at?:string;updated_at?:string}; Update:Partial<Database["public"]["Tables"]["tournaments"]["Insert"]>; Relationships:[] };
      matches: { Row:{id:string;tournament_id:string;team_id:string;opponent_name:string;match_date:string;match_time:string|null;venue:string|null;round_name:string|null;match_number:number|null;squad_size:number|null;result:"scheduled"|"won"|"lost"|"draw"|"no_result"|"cancelled";team_score:string|null;opponent_score:string|null;result_notes:string|null;notes:string|null;created_at:string;updated_at:string}; Insert:{id?:string;tournament_id:string;team_id:string;opponent_name:string;match_date:string;match_time?:string|null;venue?:string|null;round_name?:string|null;match_number?:number|null;squad_size?:number|null;result?:"scheduled"|"won"|"lost"|"draw"|"no_result"|"cancelled";team_score?:string|null;opponent_score?:string|null;result_notes?:string|null;notes?:string|null;created_at?:string;updated_at?:string}; Update:Partial<Database["public"]["Tables"]["matches"]["Insert"]>; Relationships:[] };
      match_players: { Row:{id:string;match_id:string;player_id:string;team_id:string;selected:boolean;playing_status:"selected"|"playing"|"substitute"|"unavailable"|"not_selected";availability_override:"available"|"unavailable"|"unknown";batting_order:number|null;bowling_order:number|null;is_match_captain:boolean;is_wicketkeeper:boolean;notes:string|null;created_at:string;updated_at:string}; Insert:{id?:string;match_id:string;player_id:string;team_id:string;selected?:boolean;playing_status?:"selected"|"playing"|"substitute"|"unavailable"|"not_selected";availability_override?:"available"|"unavailable"|"unknown";batting_order?:number|null;bowling_order?:number|null;is_match_captain?:boolean;is_wicketkeeper?:boolean;notes?:string|null;created_at?:string;updated_at?:string}; Update:Partial<Database["public"]["Tables"]["match_players"]["Insert"]>; Relationships:[] };
      volunteer_duties:{Row:{id:string;team_id:string;match_id:string|null;duty_date:string;duty_time:string|null;duty_type:string;description:string|null;required_people:number;status:"open"|"assigned"|"completed"|"cancelled";created_at:string;updated_at:string};Insert:{id?:string;team_id:string;match_id?:string|null;duty_date:string;duty_time?:string|null;duty_type:string;description?:string|null;required_people?:number;status?:"open"|"assigned"|"completed"|"cancelled";created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["volunteer_duties"]["Insert"]>;Relationships:[]};
      volunteer_duty_assignments:{Row:{id:string;duty_id:string;team_id:string;player_id:string;notes:string|null;completed:boolean;created_at:string;updated_at:string};Insert:{id?:string;duty_id:string;team_id:string;player_id:string;notes?:string|null;completed?:boolean;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["volunteer_duty_assignments"]["Insert"]>;Relationships:[]};
      player_import_history:{Row:{id:string;team_id:string;bucket_id:string;imported_by:string;filename:string;total_rows:number;imported_rows:number;updated_rows:number;skipped_rows:number;failed_rows:number;created_at:string};Insert:{id?:string;team_id:string;bucket_id:string;imported_by:string;filename:string;total_rows:number;imported_rows?:number;updated_rows?:number;skipped_rows?:number;failed_rows?:number;created_at?:string};Update:never;Relationships:[]};
      tournament_availability_links:{Row:{id:string;team_id:string;tournament_id:string;token_hash:string;is_active:boolean;created_by:string;expires_at:string|null;created_at:string;updated_at:string};Insert:{id?:string;team_id:string;tournament_id:string;token_hash:string;is_active?:boolean;created_by:string;expires_at?:string|null;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["tournament_availability_links"]["Insert"]>;Relationships:[]};
      match_availability:{Row:{id:string;team_id:string;tournament_id:string;match_id:string;player_id:string;availability_status:"available"|"unavailable"|"maybe";notes:string|null;submitted_at:string;updated_at:string};Insert:{id?:string;team_id:string;tournament_id:string;match_id:string;player_id:string;availability_status:"available"|"unavailable"|"maybe";notes?:string|null;submitted_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["match_availability"]["Insert"]>;Relationships:[]};
      fixture_import_history:{Row:{id:string;team_id:string;tournament_id:string;imported_by:string;filename:string;total_rows:number;imported_rows:number;updated_rows:number;skipped_rows:number;failed_rows:number;created_at:string};Insert:{id?:string;team_id:string;tournament_id:string;imported_by:string;filename:string;total_rows:number;imported_rows?:number;updated_rows?:number;skipped_rows?:number;failed_rows?:number;created_at?:string};Update:never;Relationships:[]};
      registration_forms:{Row:{id:string;tournament_id:string;token_hash:string;status:"draft"|"open"|"closed";title:string;description:string|null;instructions:string|null;banner_path:string|null;logo_path:string|null;closes_at:string|null;submit_button_text:string;created_by:string;created_at:string;updated_at:string};Insert:{id?:string;tournament_id:string;token_hash:string;status?:"draft"|"open"|"closed";title:string;description?:string|null;instructions?:string|null;banner_path?:string|null;logo_path?:string|null;closes_at?:string|null;submit_button_text?:string;created_by:string;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["registration_forms"]["Insert"]>;Relationships:[]};
      registration_form_fields:{Row:{id:string;form_id:string;field_key:string;field_type:string;label:string;help_text:string|null;placeholder:string|null;required:boolean;display_order:number;default_value:Json;options:Json;validation:Json;is_active:boolean;created_at:string;updated_at:string};Insert:{id?:string;form_id:string;field_key:string;field_type:string;label:string;help_text?:string|null;placeholder?:string|null;required?:boolean;display_order?:number;default_value?:Json;options?:Json;validation?:Json;is_active?:boolean;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["registration_form_fields"]["Insert"]>;Relationships:[]};
      registration_submissions:{Row:{id:string;form_id:string;tournament_id:string;answers:Json;email_normalized:string|null;status:"registered"|"approved"|"rejected"|"withdrawn";submitted_at:string;updated_at:string;updated_by:string|null};Insert:{id?:string;form_id:string;tournament_id:string;answers?:Json;email_normalized?:string|null;status?:"registered"|"approved"|"rejected"|"withdrawn";submitted_at?:string;updated_at?:string;updated_by?:string|null};Update:Partial<Database["public"]["Tables"]["registration_submissions"]["Insert"]>;Relationships:[]};
      tournament_auction_buckets:{Row:{id:string;tournament_id:string;name:string;description:string|null;minimum_players_per_team:number;maximum_players_per_team:number|null;max_player_bid:number|null;display_order:number;created_at:string;updated_at:string};Insert:{id?:string;tournament_id:string;name:string;description?:string|null;minimum_players_per_team?:number;maximum_players_per_team?:number|null;max_player_bid?:number|null;display_order?:number;created_at?:string;updated_at?:string};Update:Partial<Database["public"]["Tables"]["tournament_auction_buckets"]["Insert"]>;Relationships:[]};
      tournament_players:{Row:{id:string;tournament_id:string;registration_submission_id:string|null;name:string;email:string|null;phone:string|null;role:string;availability:AvailabilityStatus;bucket_id:string|null;registration_status:string;auction_status:"waiting"|"ready"|"bidding"|"sold"|"unsold"|"withdrawn";photo_path:string|null;answers:Json;sold_team_id:string|null;sold_amount:number;deleted_at:string|null;created_at:string;updated_at:string;updated_by:string|null};Insert:{id?:string;tournament_id:string;registration_submission_id?:string|null;name:string;role:string;email?:string|null;phone?:string|null;availability?:AvailabilityStatus;bucket_id?:string|null;registration_status?:string;auction_status?:string;photo_path?:string|null;answers?:Json;sold_team_id?:string|null;sold_amount?:number;deleted_at?:string|null;updated_by?:string|null};Update:Partial<Database["public"]["Tables"]["tournament_players"]["Insert"]>;Relationships:[]};
      tournament_auctions:{Row:{id:string;tournament_id:string;name:string;auction_date:string|null;start_time:string|null;location:string|null;meeting_link:string|null;status:"draft"|"scheduled"|"live"|"paused"|"completed";minimum_bid_increment:number;current_player_id:string|null;notes:string|null;created_by:string;created_at:string;updated_at:string};Insert:{id?:string;tournament_id:string;name:string;auction_date?:string|null;start_time?:string|null;location?:string|null;meeting_link?:string|null;status?:string;minimum_bid_increment?:number;created_by:string};Update:Partial<Database["public"]["Tables"]["tournament_auctions"]["Insert"]>;Relationships:[]};
      auction_bids:{Row:{id:string;tournament_id:string;auction_id:string;player_id:string;team_id:string;amount:number;bid_by:string;created_at:string};Insert:{id?:string;tournament_id:string;auction_id:string;player_id:string;team_id:string;amount:number;bid_by:string;created_at?:string};Update:never;Relationships:[]};
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
      get_public_availability_form:{Args:{p_token:string};Returns:Json};
      get_public_player_availability:{Args:{p_token:string;p_player_id:string};Returns:Json};
      submit_player_availability:{Args:{p_token:string;p_player_id:string;p_responses:Json};Returns:number};
      phase13_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
      admin_create_tournament_team:{Args:{p_tournament_id:string;p_name:string;p_primary_colour:string;p_secondary_colour:string|null;p_squad_size:number;p_total_auction_budget:number;p_manager_name?:string|null};Returns:string};
      admin_assign_team_role:{Args:{p_tournament_id:string;p_team_id:string;p_user_id:string;p_role:Exclude<TeamRole,"owner">;p_replace?:boolean};Returns:Database["public"]["Tables"]["team_members"]["Row"]};
      admin_remove_team_access:{Args:{p_tournament_id:string;p_team_id:string;p_user_id:string};Returns:boolean};
      admin_invite_team_user:{Args:{p_tournament_id:string;p_team_id:string;p_email:string;p_full_name:string;p_role:Exclude<TeamRole,"owner">;p_replace?:boolean};Returns:Json};
      get_tournament_access_directory:{Args:{p_tournament_id:string};Returns:Json};
      phase14_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
      super_admin_create_tournament:{Args:{p_name:string;p_start_date:string;p_end_date?:string|null;p_location?:string|null;p_notes?:string|null;p_status?:TournamentLifecycle};Returns:string};
      super_admin_update_tournament:{Args:{p_tournament_id:string;p_name:string;p_start_date:string;p_end_date:string|null;p_location:string|null;p_notes:string|null;p_status:TournamentLifecycle};Returns:boolean};
      super_admin_assign_tournament_role:{Args:{p_tournament_id:string;p_user_id:string;p_role:TournamentRole};Returns:Database["public"]["Tables"]["tournament_members"]["Row"]};
      super_admin_remove_tournament_access:{Args:{p_tournament_id:string;p_user_id:string};Returns:boolean};
      super_admin_invite_tournament_user:{Args:{p_tournament_id:string;p_email:string;p_full_name:string;p_role:TournamentRole};Returns:Json};
      get_platform_admin_directory:{Args:Record<PropertyKey,never>;Returns:Json};
      phase15_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
      get_public_registration_form:{Args:{p_token:string};Returns:Json};
      submit_public_registration:{Args:{p_token:string;p_answers:Json};Returns:string};
      sync_tournament_player_to_teams:{Args:{p_player_id:string};Returns:number};
      pick_random_auction_player:{Args:{p_auction_id:string;p_bucket_id:string};Returns:Database["public"]["Tables"]["tournament_players"]["Row"]};
      place_tournament_bid:{Args:{p_auction_id:string;p_team_id:string;p_amount:number};Returns:Database["public"]["Tables"]["auction_bids"]["Row"]};
      confirm_tournament_sale:{Args:{p_auction_id:string;p_bid_id:string};Returns:Database["public"]["Tables"]["tournament_players"]["Row"]};
      set_tournament_auction_player:{Args:{p_auction_id:string;p_player_id:string;p_expected_status?:string};Returns:Database["public"]["Tables"]["tournament_players"]["Row"]};
      mark_tournament_player_unsold:{Args:{p_auction_id:string;p_player_id:string};Returns:Database["public"]["Tables"]["tournament_players"]["Row"]};
      undo_tournament_sale:{Args:{p_auction_id:string;p_player_id:string};Returns:Database["public"]["Tables"]["tournament_players"]["Row"]};
      phase16_setup_status:{Args:Record<PropertyKey,never>;Returns:Json};
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
