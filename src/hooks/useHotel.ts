import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { Hotel, RoomType, RoomPhoto, HotelBooking, HotelOffer } from '@/lib/hotel-types';
import { toast } from 'sonner';

export function useHotel() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [offers, setOffers] = useState<HotelOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHotel = useCallback(async () => {
    if (!user || !selectedNumber) {
      setHotel(null);
      setRooms([]);
      setBookings([]);
      setOffers([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch hotel
      const { data: hotelData, error: hotelError } = await supabase
        .from('hotels')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .maybeSingle();

      if (hotelError) throw hotelError;
      setHotel(hotelData as Hotel | null);

      if (hotelData) {
        // Fetch rooms with photos
        const { data: roomsData, error: roomsError } = await supabase
          .from('room_types')
          .select('*, room_photos(*)')
          .eq('hotel_id', hotelData.id)
          .order('display_order');

        if (roomsError) throw roomsError;
        
        const roomsWithPhotos = (roomsData || []).map(room => ({
          ...room,
          photos: room.room_photos || [],
        })) as RoomType[];
        setRooms(roomsWithPhotos);

        // Fetch bookings with room type
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('hotel_bookings')
          .select('*, room_types(*)')
          .eq('hotel_id', hotelData.id)
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;
        
        const bookingsWithRooms = (bookingsData || []).map(booking => ({
          ...booking,
          room_type: booking.room_types,
        })) as HotelBooking[];
        setBookings(bookingsWithRooms);

        // Fetch offers
        const { data: offersData, error: offersError } = await supabase
          .from('hotel_offers')
          .select('*')
          .eq('hotel_id', hotelData.id)
          .order('created_at', { ascending: false });

        if (offersError) throw offersError;
        setOffers(offersData as HotelOffer[]);
      }
    } catch (error) {
      console.error('Error fetching hotel data:', error);
      toast.error('Failed to load hotel data');
    } finally {
      setLoading(false);
    }
  }, [user, selectedNumber]);

  useEffect(() => {
    fetchHotel();
  }, [fetchHotel]);

  // Hotel CRUD
  const createHotel = async (data: Partial<Hotel>) => {
    if (!user || !selectedNumber) return null;
    
    const insertData = {
      name: data.name || '',
      user_id: user.id,
      whatsapp_number_id: selectedNumber.id,
      description: data.description,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      google_maps_link: data.google_maps_link,
      reception_timing: data.reception_timing,
      cancellation_policy: data.cancellation_policy,
      languages: data.languages,
      is_active: data.is_active ?? true,
    };
    
    const { data: newHotel, error } = await supabase
      .from('hotels')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error('Failed to create hotel');
      throw error;
    }

    setHotel(newHotel as Hotel);
    toast.success('Hotel created successfully');
    return newHotel as Hotel;
  };

  const updateHotel = async (data: Partial<Hotel>) => {
    if (!hotel) return null;

    const updateData = {
      name: data.name,
      description: data.description,
      phone: data.phone,
      email: data.email,
      website: data.website,
      address: data.address,
      google_maps_link: data.google_maps_link,
      reception_timing: data.reception_timing,
      cancellation_policy: data.cancellation_policy,
      languages: data.languages,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedHotel, error } = await supabase
      .from('hotels')
      .update(updateData)
      .eq('id', hotel.id)
      .select()
      .single();

    if (error) {
      console.error('Hotel update error:', error);
      toast.error('Failed to update hotel');
      throw error;
    }

    setHotel(updatedHotel as Hotel);
    toast.success('Hotel updated successfully');
    return updatedHotel as Hotel;
  };

  // Room CRUD
  const createRoom = async (data: Partial<RoomType>) => {
    if (!hotel) return null;

    const insertData = {
      hotel_id: hotel.id,
      name: data.name || '',
      description: data.description,
      max_adults: data.max_adults ?? 2,
      max_children: data.max_children ?? 1,
      amenities: data.amenities || [],
      base_price: data.base_price,
      is_ac: data.is_ac ?? true,
      is_available: data.is_available ?? true,
      display_order: data.display_order ?? 0,
    };

    const { data: newRoom, error } = await supabase
      .from('room_types')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error('Failed to create room');
      throw error;
    }

    setRooms(prev => [...prev, { ...newRoom, photos: [] } as RoomType]);
    toast.success('Room created successfully');
    return newRoom as RoomType;
  };

  const updateRoom = async (roomId: string, data: Partial<RoomType>) => {
    const { data: updatedRoom, error } = await supabase
      .from('room_types')
      .update(data)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update room');
      throw error;
    }

    setRooms(prev => prev.map(r => r.id === roomId ? { ...r, ...updatedRoom } : r));
    toast.success('Room updated successfully');
    return updatedRoom as RoomType;
  };

  const deleteRoom = async (roomId: string) => {
    // Check if room has any bookings
    const { data: bookings, error: checkError } = await supabase
      .from('hotel_bookings')
      .select('id')
      .eq('room_type_id', roomId)
      .limit(1);

    if (checkError) {
      console.error('Error checking bookings:', checkError);
      toast.error('Failed to check room bookings');
      throw checkError;
    }

    if (bookings && bookings.length > 0) {
      toast.error('Cannot delete room with existing bookings. Please delete or reassign bookings first.');
      return;
    }

    // First delete all photos for this room
    const { error: photoError } = await supabase
      .from('room_photos')
      .delete()
      .eq('room_type_id', roomId);

    if (photoError) {
      console.error('Error deleting photos:', photoError);
      toast.error('Failed to delete room photos');
      throw photoError;
    }

    // Now delete the room
    const { error } = await supabase
      .from('room_types')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.error('Room delete error:', error);
      toast.error('Failed to delete room');
      throw error;
    }

    setRooms(prev => prev.filter(r => r.id !== roomId));
    toast.success('Room deleted successfully');
  };

  // Room Photos
  const uploadRoomPhoto = async (roomId: string, file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${roomId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(fileName, file);

    if (uploadError) {
      toast.error('Failed to upload photo');
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('room-photos')
      .getPublicUrl(fileName);

    const { data: photo, error: insertError } = await supabase
      .from('room_photos')
      .insert({
        room_type_id: roomId,
        photo_url: publicUrl,
      })
      .select()
      .single();

    if (insertError) {
      toast.error('Failed to save photo');
      throw insertError;
    }

    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        return { ...r, photos: [...(r.photos || []), photo as RoomPhoto] };
      }
      return r;
    }));

    toast.success('Photo uploaded successfully');
    return photo as RoomPhoto;
  };

  const deleteRoomPhoto = async (photoId: string, roomId: string) => {
    const { error } = await supabase
      .from('room_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      toast.error('Failed to delete photo');
      throw error;
    }

    setRooms(prev => prev.map(r => {
      if (r.id === roomId) {
        return { ...r, photos: (r.photos || []).filter(p => p.id !== photoId) };
      }
      return r;
    }));

    toast.success('Photo deleted successfully');
  };

  // Booking CRUD
  const updateBookingStatus = async (bookingId: string, status: HotelBooking['status']) => {
    const { data: updatedBooking, error } = await supabase
      .from('hotel_bookings')
      .update({ status })
      .eq('id', bookingId)
      .select('*, room_types(*)')
      .single();

    if (error) {
      toast.error('Failed to update booking status');
      throw error;
    }

    const bookingWithRoom = {
      ...updatedBooking,
      room_type: updatedBooking.room_types,
    } as HotelBooking;

    setBookings(prev => prev.map(b => b.id === bookingId ? bookingWithRoom : b));
    toast.success(`Booking status updated to ${status}`);
    return bookingWithRoom;
  };

  // Offers CRUD
  const createOffer = async (data: Partial<HotelOffer>) => {
    if (!hotel) return null;

    const insertData = {
      hotel_id: hotel.id,
      title: data.title || '',
      message: data.message || '',
      is_active: data.is_active ?? true,
      start_date: data.start_date,
      end_date: data.end_date,
    };

    const { data: newOffer, error } = await supabase
      .from('hotel_offers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error('Failed to create offer');
      throw error;
    }

    setOffers(prev => [newOffer as HotelOffer, ...prev]);
    toast.success('Offer created successfully');
    return newOffer as HotelOffer;
  };

  const deleteOffer = async (offerId: string) => {
    const { error } = await supabase
      .from('hotel_offers')
      .delete()
      .eq('id', offerId);

    if (error) {
      toast.error('Failed to delete offer');
      throw error;
    }

    setOffers(prev => prev.filter(o => o.id !== offerId));
    toast.success('Offer deleted successfully');
  };

  return {
    hotel,
    rooms,
    bookings,
    offers,
    loading,
    refetch: fetchHotel,
    createHotel,
    updateHotel,
    createRoom,
    updateRoom,
    deleteRoom,
    uploadRoomPhoto,
    deleteRoomPhoto,
    updateBookingStatus,
    createOffer,
    deleteOffer,
  };
}
