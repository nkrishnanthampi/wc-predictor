export type MatchStage = 'group' | 'round_of_32' | 'round_of_16' | 'quarter_final' | 'semi_final' | 'third_place' | 'final'
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed'

export type Database = {
  public: {
    Tables: {
      app_config: {
        Row: { key: string; value: string }
        Insert: { key: string; value: string }
        Update: { value?: string }
        Relationships: []
      }
      profiles: {
        Row: { id: string; email: string; display_name: string; is_admin: boolean; created_at: string }
        Insert: { id: string; email: string; display_name: string; is_admin?: boolean }
        Update: { display_name?: string; is_admin?: boolean }
        Relationships: []
      }
      leagues: {
        Row: { id: string; name: string; created_by: string; invite_code: string; created_at: string }
        Insert: { name: string; created_by: string; invite_code?: string }
        Update: { name?: string }
        Relationships: []
      }
      league_members: {
        Row: { id: string; league_id: string; user_id: string; joined_at: string }
        Insert: { league_id: string; user_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          api_match_id: number | null
          stage: MatchStage
          group_name: string | null
          match_number: number | null
          home_team: string | null
          away_team: string | null
          kickoff_time: string
          home_score: number | null
          away_score: number | null
          status: MatchStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          api_match_id?: number | null
          stage: MatchStage
          group_name?: string | null
          match_number?: number | null
          home_team?: string | null
          away_team?: string | null
          kickoff_time: string
          home_score?: number | null
          away_score?: number | null
          status?: MatchStatus
          updated_at?: string
        }
        Update: {
          api_match_id?: number | null
          stage?: MatchStage
          group_name?: string | null
          match_number?: number | null
          home_team?: string | null
          away_team?: string | null
          kickoff_time?: string
          home_score?: number | null
          away_score?: number | null
          status?: MatchStatus
          updated_at?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          points_awarded: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          points_awarded?: number | null
        }
        Update: {
          predicted_home_score?: number
          predicted_away_score?: number
          points_awarded?: number | null
        }
        Relationships: []
      }
      tournament_predictions: {
        Row: { id: string; user_id: string; league_id: string; predicted_winner: string; created_at: string }
        Insert: { user_id: string; league_id: string; predicted_winner: string }
        Update: { predicted_winner?: string }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          user_id: string
          league_id: string
          display_name: string
          email: string
          total_points: number
          predictions_scored: number
          total_predictions: number
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type League = Database['public']['Tables']['leagues']['Row']
export type LeagueMember = Database['public']['Tables']['league_members']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Prediction = Database['public']['Tables']['predictions']['Row']
export type TournamentPrediction = Database['public']['Tables']['tournament_predictions']['Row']
export type LeaderboardRow = Database['public']['Views']['leaderboard']['Row']
