-- Hotel Automation Tables

-- Hotels table (one hotel per WhatsApp number)
CREATE TABLE public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT,
    google_maps_link TEXT,
    reception_timing TEXT DEFAULT '24/7',
    cancellation_policy TEXT,
    languages TEXT[] DEFAULT '{English}'::TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(whatsapp_number_id)
);

-- Room types table
CREATE TABLE public.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    max_adults INTEGER DEFAULT 2,
    max_children INTEGER DEFAULT 1,
    amenities TEXT[] DEFAULT '{}'::TEXT[],
    base_price DECIMAL(10,2),
    is_ac BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Room photos table
CREATE TABLE public.room_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Booking status enum
CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'checked_in',
    'checked_out'
);

-- Hotel bookings table
CREATE TABLE public.hotel_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE RESTRICT,
    booking_id TEXT NOT NULL UNIQUE,
    guest_name TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    guest_whatsapp_phone TEXT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults INTEGER DEFAULT 1,
    children INTEGER DEFAULT 0,
    status public.booking_status DEFAULT 'pending',
    total_price DECIMAL(10,2),
    notes TEXT,
    reminder_sent_checkin BOOLEAN DEFAULT false,
    reminder_sent_checkout BOOLEAN DEFAULT false,
    feedback_requested BOOLEAN DEFAULT false,
    feedback_rating INTEGER,
    feedback_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Hotel offers/broadcasts table
CREATE TABLE public.hotel_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_offers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hotels
CREATE POLICY "Users can manage own hotels" ON public.hotels FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for room_types
CREATE POLICY "Users can manage own room types" ON public.room_types FOR ALL 
USING (EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = room_types.hotel_id AND h.user_id = auth.uid()));

-- RLS Policies for room_photos
CREATE POLICY "Users can manage own room photos" ON public.room_photos FOR ALL 
USING (EXISTS (SELECT 1 FROM public.room_types rt JOIN public.hotels h ON h.id = rt.hotel_id WHERE rt.id = room_photos.room_type_id AND h.user_id = auth.uid()));

-- RLS Policies for hotel_bookings
CREATE POLICY "Users can manage own hotel bookings" ON public.hotel_bookings FOR ALL 
USING (EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = hotel_bookings.hotel_id AND h.user_id = auth.uid()));

-- RLS Policies for hotel_offers
CREATE POLICY "Users can manage own hotel offers" ON public.hotel_offers FOR ALL 
USING (EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = hotel_offers.hotel_id AND h.user_id = auth.uid()));

-- Updated_at triggers
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_hotel_bookings_updated_at BEFORE UPDATE ON public.hotel_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to generate booking ID
CREATE OR REPLACE FUNCTION public.generate_booking_id(hotel_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    prefix TEXT;
    random_num TEXT;
BEGIN
    -- Get first 2 letters of hotel name, uppercase
    prefix := UPPER(LEFT(REGEXP_REPLACE(hotel_name, '[^a-zA-Z]', '', 'g'), 2));
    IF LENGTH(prefix) < 2 THEN
        prefix := 'HB';
    END IF;
    -- Generate random 5 digit number
    random_num := LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    RETURN prefix || '-' || random_num;
END;
$$;

-- Create storage bucket for room photos
INSERT INTO storage.buckets (id, name, public) VALUES ('room-photos', 'room-photos', true);

-- Storage policies for room photos
CREATE POLICY "Anyone can view room photos" ON storage.objects FOR SELECT USING (bucket_id = 'room-photos');
CREATE POLICY "Authenticated users can upload room photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'room-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own room photos" ON storage.objects FOR UPDATE USING (bucket_id = 'room-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own room photos" ON storage.objects FOR DELETE USING (bucket_id = 'room-photos' AND auth.role() = 'authenticated');