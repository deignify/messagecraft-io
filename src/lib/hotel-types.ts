// Hotel Automation Types

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';

export interface Hotel {
  id: string;
  whatsapp_number_id: string;
  user_id: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  google_maps_link?: string;
  reception_timing?: string;
  cancellation_policy?: string;
  languages?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  hotel_id: string;
  name: string;
  description?: string;
  max_adults: number;
  max_children: number;
  amenities: string[];
  base_price?: number;
  is_ac: boolean;
  is_available: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  photos?: RoomPhoto[];
}

export interface RoomPhoto {
  id: string;
  room_type_id: string;
  photo_url: string;
  display_order: number;
  created_at: string;
}

export interface HotelBooking {
  id: string;
  hotel_id: string;
  room_type_id: string;
  booking_id: string;
  guest_name: string;
  guest_phone: string;
  guest_whatsapp_phone?: string;
  check_in_date: string;
  check_out_date: string;
  adults: number;
  children: number;
  status: BookingStatus;
  total_price?: number;
  notes?: string;
  reminder_sent_checkin: boolean;
  reminder_sent_checkout: boolean;
  feedback_requested: boolean;
  feedback_rating?: number;
  feedback_comment?: string;
  id_documents?: string[]; // Array of storage paths for ID uploads
  created_at: string;
  updated_at: string;
  // Joined data
  room_type?: RoomType;
}

export interface HotelOffer {
  id: string;
  hotel_id: string;
  title: string;
  message: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

// Bot conversation state
export interface HotelBotState {
  step: 'welcome' | 'main_menu' | 'hotel_info' | 'room_list' | 'room_detail' | 
        'booking_name' | 'booking_checkin' | 'booking_checkout' | 'booking_adults' | 
        'booking_children' | 'booking_room' | 'booking_confirm' |
        'status_check' | 'contact' | 'location' | 'feedback_rating' | 'feedback_comment';
  selected_room_id?: string;
  booking_data?: {
    guest_name?: string;
    check_in_date?: string;
    check_out_date?: string;
    adults?: number;
    children?: number;
    room_type_id?: string;
  };
  booking_id_to_check?: string;
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, { emoji: string; label: string }> = {
  pending: { emoji: '🟡', label: 'Pending' },
  confirmed: { emoji: '🟢', label: 'Confirmed' },
  cancelled: { emoji: '🔴', label: 'Cancelled' },
  checked_in: { emoji: '🔵', label: 'Checked In' },
  checked_out: { emoji: '⚪', label: 'Checked Out' },
};

export const AMENITY_OPTIONS = [
  'AC',
  'Non-AC',
  'Free Wi-Fi',
  'TV',
  'Hot Water',
  'Room Service',
  'Mini Bar',
  'Balcony',
  'Sea View',
  'Mountain View',
  'Attached Bathroom',
  'Breakfast Included',
  'Laundry',
  'Parking',
];

export const LANGUAGE_OPTIONS = [
  'English',
  'Hindi',
  'Gujarati',
  'Marathi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Bengali',
  'Punjabi',
];
