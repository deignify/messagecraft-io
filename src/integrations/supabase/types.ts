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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_metrics: {
        Row: {
          agent_id: string
          conversations_handled: number | null
          conversations_resolved: number | null
          created_at: string
          date: string
          first_response_count: number | null
          first_response_time_seconds: number | null
          id: string
          messages_received: number | null
          messages_sent: number | null
          response_count: number | null
          total_response_time_seconds: number | null
          updated_at: string
          workspace_owner_id: string
        }
        Insert: {
          agent_id: string
          conversations_handled?: number | null
          conversations_resolved?: number | null
          created_at?: string
          date?: string
          first_response_count?: number | null
          first_response_time_seconds?: number | null
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          response_count?: number | null
          total_response_time_seconds?: number | null
          updated_at?: string
          workspace_owner_id: string
        }
        Update: {
          agent_id?: string
          conversations_handled?: number | null
          conversations_resolved?: number | null
          created_at?: string
          date?: string
          first_response_count?: number | null
          first_response_time_seconds?: number | null
          id?: string
          messages_received?: number | null
          messages_sent?: number | null
          response_count?: number | null
          total_response_time_seconds?: number | null
          updated_at?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      automation_sessions: {
        Row: {
          automation_id: string
          contact_phone: string
          current_step_id: string | null
          id: string
          is_active: boolean
          last_interaction_at: string
          session_data: Json | null
          started_at: string
        }
        Insert: {
          automation_id: string
          contact_phone: string
          current_step_id?: string | null
          id?: string
          is_active?: boolean
          last_interaction_at?: string
          session_data?: Json | null
          started_at?: string
        }
        Update: {
          automation_id?: string
          contact_phone?: string
          current_step_id?: string | null
          id?: string
          is_active?: boolean
          last_interaction_at?: string
          session_data?: Json | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_sessions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_sessions_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_steps: {
        Row: {
          automation_id: string
          condition_rules: Json | null
          created_at: string
          delay_seconds: number | null
          id: string
          menu_options: Json | null
          message_content: string | null
          next_step_id: string | null
          step_order: number
          step_type: Database["public"]["Enums"]["step_type"]
        }
        Insert: {
          automation_id: string
          condition_rules?: Json | null
          created_at?: string
          delay_seconds?: number | null
          id?: string
          menu_options?: Json | null
          message_content?: string | null
          next_step_id?: string | null
          step_order: number
          step_type: Database["public"]["Enums"]["step_type"]
        }
        Update: {
          automation_id?: string
          condition_rules?: Json | null
          created_at?: string
          delay_seconds?: number | null
          id?: string
          menu_options?: Json | null
          message_content?: string | null
          next_step_id?: string | null
          step_order?: number
          step_type?: Database["public"]["Enums"]["step_type"]
        }
        Relationships: [
          {
            foreignKeyName: "automation_steps_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_steps_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "automation_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          priority: number
          trigger_keywords: string[] | null
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          trigger_keywords?: string[] | null
          trigger_type: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          trigger_keywords?: string[] | null
          trigger_type?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          assigned_to: string
          conversation_id: string
          id: string
          is_active: boolean | null
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to: string
          conversation_id: string
          id?: string
          is_active?: boolean | null
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          assigned_to?: string
          conversation_id?: string
          id?: string
          is_active?: boolean | null
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          category: string | null
          created_at: string
          email: string | null
          id: string
          last_message_at: string | null
          name: string | null
          notes: string | null
          phone: string
          tags: string[] | null
          updated_at: string
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          notes?: string | null
          phone: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          notes?: string | null
          phone?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          contact_id: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          id: string
          labels: string[] | null
          last_message_at: string | null
          last_message_text: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          unread_count: number
          updated_at: string
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          contact_id?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          labels?: string[] | null
          last_message_at?: string | null
          last_message_text?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          contact_id?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          labels?: string[] | null
          last_message_at?: string | null
          last_message_text?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          unread_count?: number
          updated_at?: string
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      ctwa_campaigns: {
        Row: {
          ad_text: string | null
          clicks: number | null
          cost_per_lead: number | null
          created_at: string | null
          daily_budget: number | null
          deep_link: string | null
          id: string
          impressions: number | null
          leads: number | null
          meta_ad_id: string | null
          meta_adset_id: string | null
          meta_campaign_id: string | null
          name: string
          objective: string
          platform: string
          pre_filled_message: string | null
          spend: number | null
          status: string
          targeting: Json | null
          total_budget: number | null
          updated_at: string | null
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          ad_text?: string | null
          clicks?: number | null
          cost_per_lead?: number | null
          created_at?: string | null
          daily_budget?: number | null
          deep_link?: string | null
          id?: string
          impressions?: number | null
          leads?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          name: string
          objective?: string
          platform?: string
          pre_filled_message?: string | null
          spend?: number | null
          status?: string
          targeting?: Json | null
          total_budget?: number | null
          updated_at?: string | null
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          ad_text?: string | null
          clicks?: number | null
          cost_per_lead?: number | null
          created_at?: string | null
          daily_budget?: number | null
          deep_link?: string | null
          id?: string
          impressions?: number | null
          leads?: number | null
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          meta_campaign_id?: string | null
          name?: string
          objective?: string
          platform?: string
          pre_filled_message?: string | null
          spend?: number | null
          status?: string
          targeting?: Json | null
          total_budget?: number | null
          updated_at?: string | null
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ctwa_campaigns_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_bookings: {
        Row: {
          adults: number | null
          booking_id: string
          check_in_date: string
          check_out_date: string
          children: number | null
          created_at: string | null
          feedback_comment: string | null
          feedback_rating: number | null
          feedback_requested: boolean | null
          guest_name: string
          guest_phone: string
          guest_whatsapp_phone: string | null
          hotel_id: string
          id: string
          id_documents: string[] | null
          notes: string | null
          reminder_sent_checkin: boolean | null
          reminder_sent_checkout: boolean | null
          room_type_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          adults?: number | null
          booking_id: string
          check_in_date: string
          check_out_date: string
          children?: number | null
          created_at?: string | null
          feedback_comment?: string | null
          feedback_rating?: number | null
          feedback_requested?: boolean | null
          guest_name: string
          guest_phone: string
          guest_whatsapp_phone?: string | null
          hotel_id: string
          id?: string
          id_documents?: string[] | null
          notes?: string | null
          reminder_sent_checkin?: boolean | null
          reminder_sent_checkout?: boolean | null
          room_type_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          adults?: number | null
          booking_id?: string
          check_in_date?: string
          check_out_date?: string
          children?: number | null
          created_at?: string | null
          feedback_comment?: string | null
          feedback_rating?: number | null
          feedback_requested?: boolean | null
          guest_name?: string
          guest_phone?: string
          guest_whatsapp_phone?: string | null
          hotel_id?: string
          id?: string
          id_documents?: string[] | null
          notes?: string | null
          reminder_sent_checkin?: boolean | null
          reminder_sent_checkout?: boolean | null
          room_type_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_bookings_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_bookings_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_offers: {
        Row: {
          created_at: string | null
          end_date: string | null
          hotel_id: string
          id: string
          is_active: boolean | null
          message: string
          start_date: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          hotel_id: string
          id?: string
          is_active?: boolean | null
          message: string
          start_date?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          hotel_id?: string
          id?: string
          is_active?: boolean | null
          message?: string
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_offers_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          address: string | null
          cancellation_policy: string | null
          created_at: string | null
          description: string | null
          email: string | null
          google_maps_link: string | null
          id: string
          is_active: boolean | null
          languages: string[] | null
          name: string
          phone: string | null
          reception_timing: string | null
          updated_at: string | null
          user_id: string
          website: string | null
          whatsapp_number_id: string
        }
        Insert: {
          address?: string | null
          cancellation_policy?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          name: string
          phone?: string | null
          reception_timing?: string | null
          updated_at?: string | null
          user_id: string
          website?: string | null
          whatsapp_number_id: string
        }
        Update: {
          address?: string | null
          cancellation_policy?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          google_maps_link?: string | null
          id?: string
          is_active?: boolean | null
          languages?: string[] | null
          name?: string
          phone?: string | null
          reception_timing?: string | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotels_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: Database["public"]["Enums"]["custom_template_category"]
          created_at: string | null
          footer_text: string | null
          header_media_url: string | null
          header_text: string | null
          header_type: Database["public"]["Enums"]["template_header_type"]
          id: string
          is_deleted: boolean | null
          language: string
          status: Database["public"]["Enums"]["custom_template_status"]
          template_name: string
          updated_at: string | null
          user_id: string
          variables: Json | null
          whatsapp_number_id: string
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category?: Database["public"]["Enums"]["custom_template_category"]
          created_at?: string | null
          footer_text?: string | null
          header_media_url?: string | null
          header_text?: string | null
          header_type?: Database["public"]["Enums"]["template_header_type"]
          id?: string
          is_deleted?: boolean | null
          language?: string
          status?: Database["public"]["Enums"]["custom_template_status"]
          template_name: string
          updated_at?: string | null
          user_id: string
          variables?: Json | null
          whatsapp_number_id: string
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: Database["public"]["Enums"]["custom_template_category"]
          created_at?: string | null
          footer_text?: string | null
          header_media_url?: string | null
          header_text?: string | null
          header_type?: Database["public"]["Enums"]["template_header_type"]
          id?: string
          is_deleted?: boolean | null
          language?: string
          status?: Database["public"]["Enums"]["custom_template_status"]
          template_name?: string
          updated_at?: string | null
          user_id?: string
          variables?: Json | null
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_message: string | null
          id: string
          media_mime_type: string | null
          media_url: string | null
          read_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["message_status"]
          template_name: string | null
          template_params: Json | null
          type: Database["public"]["Enums"]["message_type"]
          user_id: string
          wa_message_id: string | null
          whatsapp_number_id: string
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_name?: string | null
          template_params?: Json | null
          type?: Database["public"]["Enums"]["message_type"]
          user_id: string
          wa_message_id?: string | null
          whatsapp_number_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["message_direction"]
          error_message?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          template_name?: string | null
          template_params?: Json | null
          type?: Database["public"]["Enums"]["message_type"]
          user_id?: string
          wa_message_id?: string | null
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quick_replies: {
        Row: {
          category: string | null
          created_at: string
          id: string
          message: string
          shortcut: string | null
          title: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          message: string
          shortcut?: string | null
          title: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          message?: string
          shortcut?: string | null
          title?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      room_photos: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          photo_url: string
          room_type_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          photo_url: string
          room_type_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          photo_url?: string
          room_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_photos_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          amenities: string[] | null
          base_price: number | null
          created_at: string | null
          description: string | null
          display_order: number | null
          hotel_id: string
          id: string
          is_ac: boolean | null
          is_available: boolean | null
          max_adults: number | null
          max_children: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          amenities?: string[] | null
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hotel_id: string
          id?: string
          is_ac?: boolean | null
          is_available?: boolean | null
          max_adults?: number | null
          max_children?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          amenities?: string[] | null
          base_price?: number | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          hotel_id?: string
          id?: string
          is_ac?: boolean | null
          is_available?: boolean | null
          max_adults?: number | null
          max_children?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["team_role"]
          token: string
          workspace_owner_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          token?: string
          workspace_owner_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["team_role"]
          token?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          is_available: boolean | null
          role: Database["public"]["Enums"]["team_role"]
          updated_at: string
          user_id: string
          workspace_owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
          user_id: string
          workspace_owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean | null
          role?: Database["public"]["Enums"]["team_role"]
          updated_at?: string
          user_id?: string
          workspace_owner_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: Database["public"]["Enums"]["template_category"]
          components: Json | null
          created_at: string
          id: string
          language: string
          last_synced_at: string | null
          meta_template_id: string
          name: string
          status: Database["public"]["Enums"]["template_status"]
          user_id: string
          whatsapp_number_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["template_category"]
          components?: Json | null
          created_at?: string
          id?: string
          language: string
          last_synced_at?: string | null
          meta_template_id: string
          name: string
          status?: Database["public"]["Enums"]["template_status"]
          user_id: string
          whatsapp_number_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["template_category"]
          components?: Json | null
          created_at?: string
          id?: string
          language?: string
          last_synced_at?: string | null
          meta_template_id?: string
          name?: string
          status?: Database["public"]["Enums"]["template_status"]
          user_id?: string
          whatsapp_number_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_whatsapp_number_id_fkey"
            columns: ["whatsapp_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          auto_assign: boolean | null
          auto_assign_enabled: boolean | null
          auto_reply_enabled: boolean | null
          auto_reply_message: string | null
          created_at: string
          id: string
          notification_sound: boolean | null
          outside_hours_message: string | null
          selected_whatsapp_id: string | null
          timezone: string | null
          updated_at: string
          working_days: string[] | null
          working_hours_enabled: boolean | null
          working_hours_end: string | null
          working_hours_start: string | null
        }
        Insert: {
          auto_assign?: boolean | null
          auto_assign_enabled?: boolean | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          created_at?: string
          id: string
          notification_sound?: boolean | null
          outside_hours_message?: string | null
          selected_whatsapp_id?: string | null
          timezone?: string | null
          updated_at?: string
          working_days?: string[] | null
          working_hours_enabled?: boolean | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Update: {
          auto_assign?: boolean | null
          auto_assign_enabled?: boolean | null
          auto_reply_enabled?: boolean | null
          auto_reply_message?: string | null
          created_at?: string
          id?: string
          notification_sound?: boolean | null
          outside_hours_message?: string | null
          selected_whatsapp_id?: string | null
          timezone?: string | null
          updated_at?: string
          working_days?: string[] | null
          working_hours_enabled?: boolean | null
          working_hours_end?: string | null
          working_hours_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_selected_whatsapp_id_fkey"
            columns: ["selected_whatsapp_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed: boolean
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
        }
        Relationships: []
      }
      whatsapp_numbers: {
        Row: {
          access_token: string
          account_type: string
          business_name: string | null
          created_at: string
          display_name: string | null
          id: string
          messaging_limit: string | null
          phone_number: string
          phone_number_id: string
          quality_rating: string | null
          status: Database["public"]["Enums"]["whatsapp_status"]
          token_expires_at: string | null
          updated_at: string
          user_id: string
          waba_id: string
        }
        Insert: {
          access_token: string
          account_type?: string
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          messaging_limit?: string | null
          phone_number: string
          phone_number_id: string
          quality_rating?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          waba_id: string
        }
        Update: {
          access_token?: string
          account_type?: string
          business_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          messaging_limit?: string | null
          phone_number?: string
          phone_number_id?: string
          quality_rating?: string | null
          status?: Database["public"]["Enums"]["whatsapp_status"]
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          waba_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_id: { Args: { hotel_name: string }; Returns: string }
      get_team_role: {
        Args: { _user_id: string; _workspace_owner_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_team_member: {
        Args: { _user_id: string; _workspace_owner_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "user"
      automation_trigger: "first_message" | "keyword" | "always"
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "checked_in"
        | "checked_out"
      conversation_status: "open" | "closed" | "pending"
      custom_template_category: "marketing" | "utility" | "authentication"
      custom_template_status: "draft" | "pending" | "approved" | "rejected"
      message_direction: "inbound" | "outbound"
      message_status: "pending" | "sent" | "delivered" | "read" | "failed"
      message_type:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "document"
        | "template"
        | "interactive"
        | "location"
        | "sticker"
      step_type: "message" | "menu" | "condition" | "delay" | "assign"
      team_role: "admin" | "manager" | "agent"
      template_category: "AUTHENTICATION" | "MARKETING" | "UTILITY"
      template_header_type: "none" | "text" | "image" | "video" | "document"
      template_status:
        | "APPROVED"
        | "PENDING"
        | "REJECTED"
        | "DISABLED"
        | "PAUSED"
        | "LIMIT_EXCEEDED"
      whatsapp_status: "active" | "pending" | "disconnected" | "error"
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
      app_role: ["superadmin", "admin", "user"],
      automation_trigger: ["first_message", "keyword", "always"],
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "checked_in",
        "checked_out",
      ],
      conversation_status: ["open", "closed", "pending"],
      custom_template_category: ["marketing", "utility", "authentication"],
      custom_template_status: ["draft", "pending", "approved", "rejected"],
      message_direction: ["inbound", "outbound"],
      message_status: ["pending", "sent", "delivered", "read", "failed"],
      message_type: [
        "text",
        "image",
        "video",
        "audio",
        "document",
        "template",
        "interactive",
        "location",
        "sticker",
      ],
      step_type: ["message", "menu", "condition", "delay", "assign"],
      team_role: ["admin", "manager", "agent"],
      template_category: ["AUTHENTICATION", "MARKETING", "UTILITY"],
      template_header_type: ["none", "text", "image", "video", "document"],
      template_status: [
        "APPROVED",
        "PENDING",
        "REJECTED",
        "DISABLED",
        "PAUSED",
        "LIMIT_EXCEEDED",
      ],
      whatsapp_status: ["active", "pending", "disconnected", "error"],
    },
  },
} as const
