import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HotelBotRequest {
  whatsapp_number_id: string;
  phone_number_id: string;
  access_token: string;
  from_phone: string;
  message_text: string;
  contact_name?: string;
}

interface BotSession {
  state: string;
  data: Record<string, unknown>;
}

interface RoomType {
  id: string;
  name: string;
  description?: string;
  max_adults?: number;
  max_children?: number;
  base_price?: number;
  amenities?: string[];
  is_ac?: boolean;
  is_available?: boolean;
}

interface RoomPhoto {
  id: string;
  photo_url: string;
  room_type_id: string;
}

// Send WhatsApp text message
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
): Promise<{ success: boolean; waMessageId?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body: message },
        }),
      }
    )
    const result = await response.json()
    console.log('WhatsApp send result:', result)
    
    const waMessageId = result?.messages?.[0]?.id
    return { success: response.ok, waMessageId }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return { success: false }
  }
}

// Send WhatsApp image message
async function sendWhatsAppImage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  imageUrl: string,
  caption?: string
): Promise<{ success: boolean; waMessageId?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'image',
          image: { 
            link: imageUrl,
            caption: caption || undefined
          },
        }),
      }
    )
    const result = await response.json()
    console.log('WhatsApp image send result:', result)
    
    const waMessageId = result?.messages?.[0]?.id
    return { success: response.ok, waMessageId }
  } catch (error) {
    console.error('Error sending WhatsApp image:', error)
    return { success: false }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body: HotelBotRequest = await req.json()
    const { whatsapp_number_id, phone_number_id, access_token, from_phone, message_text, contact_name } = body

    console.log('Hotel bot processing message:', message_text, 'from:', from_phone)

    // Get hotel for this WhatsApp number
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('*')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('is_active', true)
      .maybeSingle()

    if (hotelError || !hotel) {
      console.log('No active hotel found for this number')
      return new Response(JSON.stringify({ processed: false, reason: 'no_hotel' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Ensure we have an automation record for the Hotel Bot
    const HOTEL_BOT_AUTOMATION_NAME = 'Hotel Bot'

    const { data: existingAutomation } = await supabase
      .from('automations')
      .select('id')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('user_id', hotel.user_id)
      .eq('name', HOTEL_BOT_AUTOMATION_NAME)
      .maybeSingle()

    let hotelBotAutomationId: string | null = existingAutomation?.id ?? null

    if (!hotelBotAutomationId) {
      const { data: createdAutomation, error: createAutomationError } = await supabase
        .from('automations')
        .insert({
          name: HOTEL_BOT_AUTOMATION_NAME,
          user_id: hotel.user_id,
          whatsapp_number_id,
          trigger_type: 'always',
          is_active: true,
          priority: 100,
          trigger_keywords: [],
        })
        .select('id')
        .single()

      if (createAutomationError) {
        console.error('Failed to create Hotel Bot automation:', createAutomationError)
      } else {
        hotelBotAutomationId = createdAutomation.id
      }
    }

    // Get or create bot session
    let session: BotSession = { state: 'welcome', data: {} }
    let sessionRowId: string | null = null

    if (hotelBotAutomationId) {
      const { data: existingSession } = await supabase
        .from('automation_sessions')
        .select('session_data, id')
        .eq('automation_id', hotelBotAutomationId)
        .eq('contact_phone', from_phone)
        .eq('is_active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession?.session_data) {
        session = existingSession.session_data as BotSession
        sessionRowId = existingSession.id
      } else {
        const { data: createdSession, error: createSessionError } = await supabase
          .from('automation_sessions')
          .insert({
            automation_id: hotelBotAutomationId,
            contact_phone: from_phone,
            is_active: true,
            session_data: session,
            last_interaction_at: new Date().toISOString(),
          })
          .select('id, session_data')
          .single()

        if (createSessionError) {
          console.error('Failed to create hotel bot session:', createSessionError)
        } else {
          sessionRowId = createdSession.id
          session = createdSession.session_data as BotSession
        }
      }
    }

    const msg = message_text.toLowerCase().trim()
    let response = ''
    let newState = session.state
    let imagesToSend: { url: string; caption?: string }[] = []

    // Helper function to show main menu
    const getMainMenuResponse = () => {
      let menuText = `🏨 *Welcome to ${hotel.name}!*\n\n`
      menuText += `How can I help you today?\n\n`
      menuText += `1️⃣ Hotel Information\n`
      menuText += `2️⃣ View Room Types\n`
      menuText += `3️⃣ Make a Booking Inquiry\n`
      menuText += `4️⃣ Check Booking Status\n`
      menuText += `5️⃣ Contact Us\n`
      menuText += `6️⃣ Location & Directions\n\n`
      menuText += `_Reply with a number (1-6) or type 0 for menu_`
      return menuText
    }

    // Helper to fetch rooms with photos
    const fetchRoomsWithPhotos = async (): Promise<(RoomType & { photos: RoomPhoto[] })[]> => {
      const { data: rooms } = await supabase
        .from('room_types')
        .select('*, room_photos(*)')
        .eq('hotel_id', hotel.id)
        .eq('is_available', true)
        .order('display_order')
      
      return (rooms || []).map(room => ({
        ...room,
        photos: room.room_photos || []
      }))
    }

    // States that are in middle of data collection - do NOT allow menu shortcuts
    const dataCollectionStates = [
      'booking_name', 'booking_checkin', 'booking_checkout', 
      'booking_adults', 'booking_children', 'booking_room_select', 'booking_confirm', 
      'check_booking', 'view_room_detail'
    ]
    
    const isInDataCollection = dataCollectionStates.includes(session.state)
    
    // Check for menu reset (0, menu, back) - always works
    const isMenuReset = ['0', 'menu', 'back'].includes(msg)
    
    // Check for initial greeting - only works when not in data collection
    const isGreeting = ['hi', 'hello', 'start', 'hey', 'hii'].includes(msg)
    
    // Process message based on current state
    
    // RESET: 0/menu/back always returns to main menu
    if (isMenuReset) {
      response = getMainMenuResponse()
      newState = 'main_menu'
      session.data = {}
    }
    // GREETING: Only when not in data collection
    else if (isGreeting && !isInDataCollection) {
      response = getMainMenuResponse()
      newState = 'main_menu'
      session.data = {}
    }
    // MAIN MENU or WELCOME state - process menu options
    else if (session.state === 'welcome' || session.state === 'main_menu') {
      switch (msg) {
        case '1': // Hotel Information
          response = `🏨 *${hotel.name}*\n\n`
          
          // Professional description
          if (hotel.description) {
            response += `${hotel.description}\n\n`
          } else {
            response += `Welcome to our hotel! We offer comfortable accommodation with excellent service and modern amenities for all our guests.\n\n`
          }
          
          response += `━━━━━━━━━━━━━━━━━━━━\n`
          
          // Check-in/Check-out timing
          if (hotel.reception_timing) {
            response += `🕐 *Check-in/Check-out:* ${hotel.reception_timing}\n`
          } else {
            response += `🕐 *Check-in:* 2:00 PM | *Check-out:* 11:00 AM\n`
          }
          
          // Languages supported
          if (hotel.languages?.length) {
            response += `🗣️ *Languages:* ${hotel.languages.join(' • ')}\n`
          }
          
          response += `━━━━━━━━━━━━━━━━━━━━\n\n`
          
          // Contact details - clickable format
          if (hotel.phone) response += `📞 *Phone:* ${hotel.phone}\n`
          if (hotel.email) response += `📧 *Email:* ${hotel.email}\n`
          if (hotel.website) response += `🌐 *Website:* ${hotel.website}\n`
          
          if (hotel.cancellation_policy) {
            response += `\n📋 *Cancellation Policy:*\n${hotel.cancellation_policy}\n`
          }
          
          response += `\n_Reply 0 for menu_`
          newState = 'main_menu'
          break
          
        case '2': // View Rooms - List with numbers, NO prices
          const rooms = await fetchRoomsWithPhotos()
          if (!rooms.length) {
            response = `😔 No rooms available at the moment.\n\n_Reply 0 for menu_`
          } else {
            response = `🛏️ *Room Types at ${hotel.name}*\n\n`
            rooms.forEach((room, index) => {
              const roomNum = index + 1
              response += `*${roomNum}.* ${room.name}\n`
              response += `   👥 ${room.max_adults || 2} Adults, ${room.max_children || 1} Children\n`
              if (room.is_ac) response += `   ❄️ Air Conditioned\n`
              response += `\n`
            })
            response += `━━━━━━━━━━━━━━━━━━━━\n`
            response += `Reply with room number (1-${rooms.length}) to see details\n`
            response += `Reply *3* to make a booking\n`
            response += `_Reply 0 for menu_`
            
            // Store rooms for later reference
            session.data.rooms_cache = rooms.map((r, i) => ({ index: i + 1, id: r.id, name: r.name }))
          }
          newState = 'view_room_list'
          break
          
        case '3': // Start Booking - Auto capture phone
          response = `📅 *Booking Inquiry*\n\n`
          response += `📱 Phone: ${from_phone} _(auto-captured)_\n\n`
          response += `Please enter your *full name*:`
          newState = 'booking_name'
          session.data = { guest_phone: from_phone }
          break
          
        case '4': // Check Booking Status
          response = `🔍 *Check Booking Status*\n\nPlease enter your *Booking ID*:`
          newState = 'check_booking'
          break
          
        case '5': // Contact Us - Clickable format
          response = `📞 *Contact Us - ${hotel.name}*\n\n`
          if (hotel.phone) response += `📱 Phone: ${hotel.phone}\n`
          if (hotel.email) response += `📧 Email: ${hotel.email}\n`
          if (hotel.website) response += `🌐 Website: ${hotel.website}\n`
          if (hotel.reception_timing) response += `\n🕐 Reception: ${hotel.reception_timing}\n`
          response += `\n💬 You can also chat with us right here!\n`
          response += `\n_Reply 0 for menu_`
          newState = 'main_menu'
          break
          
        case '6': // Location
          response = `📍 *Location - ${hotel.name}*\n\n`
          if (hotel.address) response += `🏨 *Address:*\n${hotel.address}\n\n`
          if (hotel.google_maps_link) response += `🗺️ *Google Maps:*\n${hotel.google_maps_link}\n\n`
          else response += `📍 Contact us for directions.\n\n`
          response += `_Reply 0 for menu_`
          newState = 'main_menu'
          break
          
        default:
          response = getMainMenuResponse()
          newState = 'main_menu'
      }
    }
    // VIEW ROOM LIST - User can select room number to see details
    else if (session.state === 'view_room_list') {
      const roomNum = parseInt(msg)
      const roomsCache = (session.data.rooms_cache as { index: number; id: string; name: string }[]) || []
      
      if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= roomsCache.length) {
        // Fetch full room details
        const selectedRoom = roomsCache.find(r => r.index === roomNum)
        if (selectedRoom) {
          const { data: room } = await supabase
            .from('room_types')
            .select('*, room_photos(*)')
            .eq('id', selectedRoom.id)
            .single()
          
          if (room) {
            const photos = room.room_photos || []
            
            response = `🛏️ *${room.name}*\n\n`
            response += `━━━━━━━━━━━━━━━━━━━━\n`
            response += `👥 *Capacity:* ${room.max_adults || 2} Adults, ${room.max_children || 1} Children\n`
            if (room.is_ac) response += `❄️ *Air Conditioned:* Yes\n`
            
            if (room.description) {
              response += `\n📝 *Description:*\n${room.description}\n`
            }
            
            if (room.amenities?.length) {
              response += `\n✨ *Amenities:*\n`
              room.amenities.forEach((amenity: string) => {
                response += `  • ${amenity}\n`
              })
            }
            
            response += `━━━━━━━━━━━━━━━━━━━━\n\n`
            
            if (photos.length > 0) {
              response += `📸 ${photos.length} photo(s) available\n\n`
              // Queue photos to send
              photos.forEach((photo: RoomPhoto, idx: number) => {
                imagesToSend.push({
                  url: photo.photo_url,
                  caption: idx === 0 ? `${room.name} - Photo ${idx + 1}/${photos.length}` : undefined
                })
              })
            }
            
            response += `Reply *3* to book this room\n`
            response += `Reply *2* to see all rooms\n`
            response += `_Reply 0 for menu_`
            
            session.data.selected_room = { id: room.id, name: room.name }
          }
        }
        newState = 'main_menu'
      } else if (msg === '3') {
        // Start booking from room list
        response = `📅 *Booking Inquiry*\n\n`
        response += `📱 Phone: ${from_phone} _(auto-captured)_\n\n`
        response += `Please enter your *full name*:`
        newState = 'booking_name'
        session.data = { guest_phone: from_phone }
      } else {
        response = `❌ Invalid selection.\n\nReply with room number or 0 for menu.`
      }
    }
    // BOOKING FLOW: Name
    else if (session.state === 'booking_name') {
      const guestName = message_text.trim()
      if (guestName.length >= 2) {
        session.data.guest_name = guestName
        response = `Thank you, *${guestName}*!\n\nPlease enter your *check-in date* (DD/MM/YYYY):`
        newState = 'booking_checkin'
      } else {
        response = `❌ Please enter a valid name (at least 2 characters)`
      }
    }
    // BOOKING FLOW: Check-in date
    else if (session.state === 'booking_checkin') {
      const dateMatch = message_text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (dateMatch) {
        let [, day, month, year] = dateMatch
        if (year.length === 2) year = '20' + year
        session.data.check_in = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
        session.data.check_in_db = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        response = `✅ Check-in: *${session.data.check_in}*\n\nPlease enter your *check-out date* (DD/MM/YYYY):`
        newState = 'booking_checkout'
      } else {
        response = `❌ Invalid date format.\n\nPlease use DD/MM/YYYY (e.g., 15/02/2026)`
      }
    }
    // BOOKING FLOW: Check-out date
    else if (session.state === 'booking_checkout') {
      const dateMatch = message_text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (dateMatch) {
        let [, day, month, year] = dateMatch
        if (year.length === 2) year = '20' + year
        session.data.check_out = `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`
        session.data.check_out_db = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        response = `✅ Check-out: *${session.data.check_out}*\n\nHow many *adults* will be staying?`
        newState = 'booking_adults'
      } else {
        response = `❌ Invalid date format.\n\nPlease use DD/MM/YYYY (e.g., 17/02/2026)`
      }
    }
    // BOOKING FLOW: Adults count
    else if (session.state === 'booking_adults') {
      const adults = parseInt(msg)
      if (!isNaN(adults) && adults >= 1 && adults <= 20) {
        session.data.adults = adults
        response = `✅ *${adults}* adult(s) noted.\n\nHow many *children* (0 if none)?`
        newState = 'booking_children'
      } else {
        response = `❌ Please enter a valid number of adults (1-20)`
      }
    }
    // BOOKING FLOW: Children count
    else if (session.state === 'booking_children') {
      const children = parseInt(msg)
      if (!isNaN(children) && children >= 0 && children <= 10) {
        session.data.children = children
        
        // Fetch rooms for selection
        const rooms = await fetchRoomsWithPhotos()
        if (!rooms.length) {
          response = `❌ Sorry, no rooms available. Please contact us directly.\n\n_Reply 0 for menu_`
          newState = 'main_menu'
          session.data = {}
        } else {
          response = `✅ *${children}* child(ren) noted.\n\n`
          response += `🛏️ *Select Room Type:*\n\n`
          rooms.forEach((room, index) => {
            response += `*${index + 1}.* ${room.name}\n`
            response += `   👥 ${room.max_adults || 2} Adults, ${room.max_children || 1} Children\n\n`
          })
          response += `Reply with room number (1-${rooms.length}):`
          
          session.data.available_rooms = rooms.map((r, i) => ({ index: i + 1, id: r.id, name: r.name }))
          newState = 'booking_room_select'
        }
      } else {
        response = `❌ Please enter a valid number of children (0-10)`
      }
    }
    // BOOKING FLOW: Room selection
    else if (session.state === 'booking_room_select') {
      const roomNum = parseInt(msg)
      const availableRooms = (session.data.available_rooms as { index: number; id: string; name: string }[]) || []
      
      if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= availableRooms.length) {
        const selectedRoom = availableRooms.find(r => r.index === roomNum)
        if (selectedRoom) {
          session.data.room_id = selectedRoom.id
          session.data.room_name = selectedRoom.name
          
          response = `📋 *Booking Summary*\n\n`
          response += `━━━━━━━━━━━━━━━━━━━━\n`
          response += `👤 *Name:* ${session.data.guest_name}\n`
          response += `📱 *Phone:* ${session.data.guest_phone}\n`
          response += `━━━━━━━━━━━━━━━━━━━━\n`
          response += `📅 *Check-in:* ${session.data.check_in}\n`
          response += `📅 *Check-out:* ${session.data.check_out}\n`
          response += `👥 *Guests:* ${session.data.adults} Adults, ${session.data.children} Children\n`
          response += `🛏️ *Room:* ${selectedRoom.name}\n`
          response += `━━━━━━━━━━━━━━━━━━━━\n\n`
          response += `Reply *YES* to confirm or *CANCEL* to cancel`
          newState = 'booking_confirm'
        }
      } else {
        response = `❌ Invalid selection. Please enter a number between 1 and ${availableRooms.length}`
      }
    }
    // BOOKING FLOW: Confirm or cancel
    else if (session.state === 'booking_confirm') {
      if (msg === 'yes' || msg === 'confirm') {
        // Generate unique 8-digit booking ID
        const bookingId = `${Math.floor(10000000 + Math.random() * 90000000)}`
        
        // Create booking
        const { error: bookingError } = await supabase.from('hotel_bookings').insert({
          hotel_id: hotel.id,
          room_type_id: session.data.room_id as string,
          booking_id: bookingId,
          guest_name: session.data.guest_name as string,
          guest_phone: session.data.guest_phone as string,
          guest_whatsapp_phone: from_phone,
          check_in_date: session.data.check_in_db as string,
          check_out_date: session.data.check_out_db as string,
          adults: session.data.adults as number,
          children: session.data.children as number,
          status: 'pending',
        })

        if (bookingError) {
          console.error('Booking error:', bookingError)
          response = `❌ Sorry, there was an error. Please try again.\n\n_Reply 0 for menu_`
        } else {
          response = `✅ *Booking Request Received!*\n\n`
          response += `Thank you, *${session.data.guest_name}*!\n\n`
          response += `━━━━━━━━━━━━━━━━━━━━\n`
          response += `📋 *Booking ID:* ${bookingId}\n`
          response += `_(Save this ID to check status)_\n`
          response += `━━━━━━━━━━━━━━━━━━━━\n\n`
          response += `📅 *Check-in:* ${session.data.check_in}\n`
          response += `📅 *Check-out:* ${session.data.check_out}\n`
          response += `👥 *Guests:* ${session.data.adults} Adults, ${session.data.children} Children\n`
          response += `🛏️ *Room:* ${session.data.room_name}\n\n`
          response += `Our team will contact you shortly to confirm.\n\n`
          response += `_Reply 0 for menu_`
        }
        newState = 'main_menu'
        session.data = {}
      } else if (msg === 'cancel' || msg === 'no') {
        response = `❌ Booking cancelled.\n\n_Reply 0 for menu_`
        newState = 'main_menu'
        session.data = {}
      } else {
        response = `Reply *YES* to confirm or *CANCEL* to cancel.`
      }
    }
    // CHECK BOOKING STATUS
    else if (session.state === 'check_booking') {
      const bookingIdInput = message_text.trim()
      
      const { data: booking } = await supabase
        .from('hotel_bookings')
        .select('*, room_types(name)')
        .ilike('booking_id', bookingIdInput)
        .eq('hotel_id', hotel.id)
        .maybeSingle()

      if (booking) {
        const statusEmoji: Record<string, string> = {
          pending: '⏳',
          confirmed: '✅',
          cancelled: '❌',
          checked_in: '🔵',
          checked_out: '✔️',
        }
        const statusLabels: Record<string, string> = {
          pending: 'Pending Confirmation',
          confirmed: 'Confirmed',
          cancelled: 'Cancelled',
          checked_in: 'Checked In',
          checked_out: 'Checked Out',
        }
        
        response = `📋 *Booking Status*\n\n`
        response += `━━━━━━━━━━━━━━━━━━━━\n`
        response += `🔖 *Booking ID:* ${booking.booking_id}\n`
        response += `${statusEmoji[booking.status || 'pending']} *Status:* ${statusLabels[booking.status || 'pending']}\n`
        response += `━━━━━━━━━━━━━━━━━━━━\n\n`
        response += `👤 Name: ${booking.guest_name}\n`
        response += `📅 Check-in: ${booking.check_in_date}\n`
        response += `📅 Check-out: ${booking.check_out_date}\n`
        response += `👥 Guests: ${booking.adults} Adults, ${booking.children || 0} Children\n`
        if (booking.room_types?.name) response += `🛏️ Room: ${booking.room_types.name}\n`
        response += `\n_For queries, reply 5 to contact us_\n`
        response += `_Reply 0 for menu_`
      } else {
        response = `❌ Booking ID *${bookingIdInput}* not found.\n\nPlease check your ID and try again.\n\n_Reply 0 for menu_`
      }
      newState = 'main_menu'
    }
    // DEFAULT: Unknown state - show menu
    else {
      response = getMainMenuResponse()
      newState = 'main_menu'
    }

    // Update session
    session.state = newState
    if (sessionRowId) {
      await supabase
        .from('automation_sessions')
        .update({ session_data: session, last_interaction_at: new Date().toISOString() })
        .eq('id', sessionRowId)
    }

    // Send images first if any
    for (const img of imagesToSend) {
      await sendWhatsAppImage(phone_number_id, access_token, from_phone, img.url, img.caption)
    }

    // Send response via WhatsApp
    const { success: sendSuccess, waMessageId } = await sendWhatsAppMessage(phone_number_id, access_token, from_phone, response)

    // Get or create conversation for this contact
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('contact_phone', from_phone)
      .maybeSingle()

    if (conversation) {
      // Save bot message to messages table so it appears in LiveChat
      await supabase.from('messages').insert({
        conversation_id: conversation.id,
        whatsapp_number_id,
        user_id: hotel.user_id,
        direction: 'outbound',
        type: 'text',
        content: response,
        status: sendSuccess ? 'sent' : 'failed',
        wa_message_id: waMessageId || null,
        sent_at: new Date().toISOString(),
      })

      // Update conversation with last message
      await supabase
        .from('conversations')
        .update({
          last_message_text: response.substring(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversation.id)
    }

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Hotel bot error:', error)
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
