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

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  message: string
): Promise<boolean> {
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
    return response.ok
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return false
  }
}

// Send interactive list message
async function sendInteractiveList(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  headerText: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
): Promise<boolean> {
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
          type: 'interactive',
          interactive: {
            type: 'list',
            header: { type: 'text', text: headerText },
            body: { text: bodyText },
            action: {
              button: buttonText,
              sections,
            },
          },
        }),
      }
    )
    return response.ok
  } catch (error) {
    console.error('Error sending interactive list:', error)
    return false
  }
}

// Send interactive button message
async function sendInteractiveButtons(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
): Promise<boolean> {
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
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.title },
              })),
            },
          },
        }),
      }
    )
    return response.ok
  } catch (error) {
    console.error('Error sending interactive buttons:', error)
    return false
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

    // Get or create bot session
    const sessionKey = `hotel_bot_${whatsapp_number_id}_${from_phone}`
    let session: BotSession = { state: 'welcome', data: {} }

    // Check for existing session in automation_sessions
    const { data: existingSession } = await supabase
      .from('automation_sessions')
      .select('session_data, id')
      .eq('contact_phone', from_phone)
      .eq('is_active', true)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSession?.session_data) {
      session = existingSession.session_data as BotSession
    }

    const msg = message_text.toLowerCase().trim()
    let response = ''
    let newState = session.state

    // Helper function to show main menu
    const getMainMenuResponse = () => {
      let menuText = `🏨 Welcome to *${hotel.name}*!\n\n`
      if (hotel.description) menuText += `${hotel.description}\n\n`
      menuText += `How can I help you today?\n\n`
      menuText += `1️⃣ Hotel Information\n`
      menuText += `2️⃣ View Rooms & Prices\n`
      menuText += `3️⃣ Make a Booking\n`
      menuText += `4️⃣ Check Booking Status\n`
      menuText += `5️⃣ Contact Us\n`
      menuText += `6️⃣ Location & Directions\n\n`
      menuText += `_Reply with a number (1-6) to continue_`
      return menuText
    }

    // Process based on current state and message
    // Keywords that trigger menu regardless of state
    const isMenuTrigger = ['hi', 'hello', 'menu', 'start', 'hey', 'hii', '0', 'back'].includes(msg)
    
    if (isMenuTrigger || session.state === 'welcome') {
      response = getMainMenuResponse()
      newState = 'main_menu'
    }
    // Handle main menu selections (1-6)
    else if (session.state === 'main_menu' && ['1', '2', '3', '4', '5', '6'].includes(msg)) {
      if (msg === '1') {
        // Hotel Information
        response = `🏨 *${hotel.name}*\n\n`
        if (hotel.description) response += `📝 ${hotel.description}\n\n`
        if (hotel.phone) response += `📞 Phone: ${hotel.phone}\n`
        if (hotel.email) response += `📧 Email: ${hotel.email}\n`
        if (hotel.website) response += `🌐 Website: ${hotel.website}\n`
        if (hotel.reception_timing) response += `🕐 Reception: ${hotel.reception_timing}\n`
        if (hotel.languages?.length) response += `🗣️ Languages: ${hotel.languages.join(', ')}\n`
        if (hotel.cancellation_policy) response += `\n📋 *Cancellation Policy:*\n${hotel.cancellation_policy}\n`
        response += `\n_Reply "menu" to go back_`
        newState = 'main_menu'
      }
      else if (msg === '2') {
        // View Rooms
        const { data: rooms } = await supabase
          .from('room_types')
          .select('*, room_photos(*)')
          .eq('hotel_id', hotel.id)
          .eq('is_available', true)
          .order('display_order')

        if (!rooms?.length) {
          response = `😔 No rooms available at the moment.\n\n_Reply "menu" to go back_`
          newState = 'main_menu'
        } else {
          response = `🛏️ *Available Rooms at ${hotel.name}*\n\n`
          rooms.forEach((room, index) => {
            response += `*${index + 1}. ${room.name}*\n`
            response += `👥 Capacity: ${room.max_adults} Adults, ${room.max_children} Children\n`
            response += `❄️ ${room.is_ac ? 'AC' : 'Non-AC'}\n`
            if (room.base_price) response += `💰 Price: ₹${room.base_price}/night\n`
            if (room.amenities?.length) response += `✨ ${room.amenities.slice(0, 3).join(', ')}${room.amenities.length > 3 ? '...' : ''}\n`
            response += `\n`
          })
          response += `_Reply with room number (1-${rooms.length}) to book, or "menu" to go back_`
          session.data.rooms = rooms
          newState = 'select_room'
        }
      }
      else if (msg === '3') {
        // Start booking flow
        const { data: rooms } = await supabase
          .from('room_types')
          .select('*')
          .eq('hotel_id', hotel.id)
          .eq('is_available', true)
          .order('display_order')

        if (!rooms?.length) {
          response = `😔 No rooms available for booking.\n\n_Reply "menu" to go back_`
          newState = 'main_menu'
        } else {
          response = `📋 *Make a Booking*\n\nPlease select a room:\n\n`
          rooms.forEach((room, index) => {
            response += `${index + 1}. ${room.name}`
            if (room.base_price) response += ` - ₹${room.base_price}/night`
            response += `\n`
          })
          response += `\n_Reply with room number to continue_`
          session.data.rooms = rooms
          newState = 'booking_select_room'
        }
      }
      else if (msg === '4') {
        // Check booking status
        response = `🔍 *Check Booking Status*\n\nPlease enter your Booking ID (e.g., HC-12345):`
        newState = 'check_booking'
      }
      else if (msg === '5') {
        // Contact Us
        response = `📞 *Contact ${hotel.name}*\n\n`
        if (hotel.phone) response += `📱 Phone: ${hotel.phone}\n`
        if (hotel.email) response += `📧 Email: ${hotel.email}\n`
        if (hotel.website) response += `🌐 Website: ${hotel.website}\n`
        if (hotel.reception_timing) response += `🕐 Reception Hours: ${hotel.reception_timing}\n`
        response += `\n💬 You can also chat with us right here on WhatsApp!\n`
        response += `\n_Reply "menu" to go back_`
        newState = 'main_menu'
      }
      else if (msg === '6') {
        // Location
        response = `📍 *Location & Directions*\n\n`
        if (hotel.address) response += `🏨 Address:\n${hotel.address}\n\n`
        if (hotel.google_maps_link) response += `🗺️ Google Maps:\n${hotel.google_maps_link}\n\n`
        else response += `📍 Map link not available.\n\n`
        response += `_Reply "menu" to go back_`
        newState = 'main_menu'
      }
    }
    // Handle room selection from "View Rooms" flow
    else if (session.state === 'select_room') {
      const roomIndex = parseInt(msg) - 1
      const rooms = session.data.rooms as Array<{ id: string; name: string; base_price?: number; description?: string; amenities?: string[]; max_adults?: number; max_children?: number; is_ac?: boolean }>
      
      if (!isNaN(roomIndex) && roomIndex >= 0 && roomIndex < rooms.length) {
        const room = rooms[roomIndex]
        response = `🛏️ *${room.name}*\n\n`
        if (room.description) response += `📝 ${room.description}\n\n`
        response += `👥 Capacity: ${room.max_adults || 2} Adults, ${room.max_children || 1} Children\n`
        response += `❄️ ${room.is_ac ? 'Air Conditioned' : 'Non-AC'}\n`
        if (room.base_price) response += `💰 Price: ₹${room.base_price}/night\n`
        if (room.amenities?.length) response += `\n✨ *Amenities:*\n${room.amenities.map(a => `• ${a}`).join('\n')}\n`
        response += `\n📅 Would you like to book this room?\n\n`
        response += `Reply *"book"* to proceed with booking\nReply *"menu"* to go back to main menu`
        session.data.selected_room = room
        newState = 'room_detail'
      } else {
        response = `❌ Invalid selection. Please enter a number between 1 and ${rooms?.length || 1}, or "menu" to go back.`
      }
    }
    // Handle room detail actions
    else if (session.state === 'room_detail') {
      if (msg === 'book' || msg === 'yes') {
        response = `📋 *Booking: ${(session.data.selected_room as { name: string })?.name}*\n\nPlease enter your *full name*:`
        newState = 'booking_name'
      } else {
        response = `Reply *"book"* to proceed with booking or *"menu"* to go back.`
      }
    }
    // Handle room selection from "Make a Booking" flow
    else if (session.state === 'booking_select_room') {
      const roomIndex = parseInt(msg) - 1
      const rooms = session.data.rooms as Array<{ id: string; name: string; base_price?: number }>
      
      if (!isNaN(roomIndex) && roomIndex >= 0 && roomIndex < rooms.length) {
        session.data.selected_room = rooms[roomIndex]
        response = `✅ You selected: *${rooms[roomIndex].name}*\n\n`
        response += `Please enter your *full name*:`
        newState = 'booking_name'
      } else {
        response = `❌ Invalid selection. Please enter a number between 1 and ${rooms?.length || 1}`
      }
    }
    // Booking flow - collect guest name
    else if (session.state === 'booking_name') {
      const guestName = message_text.trim()
      if (guestName.length >= 2) {
        session.data.guest_name = guestName
        response = `👤 Name: *${guestName}*\n\nNow please enter your *check-in date* (DD/MM/YYYY):`
        newState = 'booking_checkin'
      } else {
        response = `❌ Please enter a valid name (at least 2 characters)`
      }
    }
    // Booking flow - collect check-in date
    else if (session.state === 'booking_checkin') {
      const dateMatch = message_text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (dateMatch) {
        let [, day, month, year] = dateMatch
        if (year.length === 2) year = '20' + year
        const checkInDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        
        // Validate date is not in past
        const today = new Date().toISOString().split('T')[0]
        if (checkInDate < today) {
          response = `❌ Check-in date cannot be in the past. Please enter a future date.`
        } else {
          session.data.check_in = checkInDate
          response = `📅 Check-in: *${day}/${month}/${year}*\n\nNow please enter your *check-out date* (DD/MM/YYYY):`
          newState = 'booking_checkout'
        }
      } else {
        response = `❌ Invalid date format. Please use DD/MM/YYYY (e.g., 15/02/2025)`
      }
    }
    // Booking flow - collect check-out date
    else if (session.state === 'booking_checkout') {
      const dateMatch = message_text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (dateMatch) {
        let [, day, month, year] = dateMatch
        if (year.length === 2) year = '20' + year
        const checkOutDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const checkInDate = session.data.check_in as string
        
        // Validate check-out is after check-in
        if (checkOutDate <= checkInDate) {
          response = `❌ Check-out date must be after check-in date (${checkInDate}). Please try again.`
        } else {
          session.data.check_out = checkOutDate
          response = `📅 Check-out: *${day}/${month}/${year}*\n\nHow many *adults*? (1-10)`
          newState = 'booking_adults'
        }
      } else {
        response = `❌ Invalid date format. Please use DD/MM/YYYY (e.g., 17/02/2025)`
      }
    }
    // Booking flow - collect adults count
    else if (session.state === 'booking_adults') {
      const adults = parseInt(msg)
      if (!isNaN(adults) && adults >= 1 && adults <= 10) {
        session.data.adults = adults
        response = `👨 Adults: *${adults}*\n\nHow many *children*? (0-5)`
        newState = 'booking_children'
      } else {
        response = `❌ Please enter a number between 1 and 10`
      }
    }
    // Booking flow - collect children count and create booking
    else if (session.state === 'booking_children') {
      const children = parseInt(msg)
      if (!isNaN(children) && children >= 0 && children <= 5) {
        session.data.children = children
        
        // Generate booking ID
        const { data: bookingIdData } = await supabase.rpc('generate_booking_id', { hotel_name: hotel.name })
        const bookingId = bookingIdData || `BK-${Date.now().toString().slice(-5)}`
        
        const selectedRoom = session.data.selected_room as { id: string; name: string; base_price?: number }
        
        // Calculate total price if base_price exists
        const checkIn = new Date(session.data.check_in as string)
        const checkOut = new Date(session.data.check_out as string)
        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        const totalPrice = selectedRoom.base_price ? selectedRoom.base_price * nights : null
        
        // Create booking
        const { error: bookingError } = await supabase.from('hotel_bookings').insert({
          hotel_id: hotel.id,
          room_type_id: selectedRoom.id,
          booking_id: bookingId,
          guest_name: session.data.guest_name as string,
          guest_phone: from_phone,
          guest_whatsapp_phone: from_phone,
          check_in_date: session.data.check_in as string,
          check_out_date: session.data.check_out as string,
          adults: session.data.adults as number,
          children,
          total_price: totalPrice,
          status: 'pending',
        })

        if (bookingError) {
          console.error('Booking error:', bookingError)
          response = `❌ Sorry, there was an error creating your booking. Please try again later or contact us directly.\n\n_Reply "menu" to go back_`
        } else {
          response = `✅ *Booking Request Submitted!*\n\n`
          response += `━━━━━━━━━━━━━━━\n`
          response += `🆔 Booking ID: *${bookingId}*\n`
          response += `━━━━━━━━━━━━━━━\n\n`
          response += `🏨 Room: ${selectedRoom.name}\n`
          response += `👤 Guest: ${session.data.guest_name}\n`
          response += `📅 Check-in: ${session.data.check_in}\n`
          response += `📅 Check-out: ${session.data.check_out}\n`
          response += `🌙 Nights: ${nights}\n`
          response += `👥 Guests: ${session.data.adults} Adults, ${children} Children\n`
          if (totalPrice) response += `💰 Estimated Total: ₹${totalPrice}\n`
          response += `\n📌 Status: 🟡 *Pending Confirmation*\n\n`
          response += `⚠️ *Save your Booking ID to check status later!*\n\n`
          response += `_Our team will confirm your booking shortly via WhatsApp._\n\n`
          response += `_Reply "menu" to return to main menu_`
        }
        newState = 'main_menu'
        session.data = {} // Clear session data after booking
      } else {
        response = `❌ Please enter a number between 0 and 5`
      }
    }
    // Check booking status flow
    else if (session.state === 'check_booking') {
      const bookingIdInput = message_text.trim().toUpperCase()
      
      const { data: booking } = await supabase
        .from('hotel_bookings')
        .select('*, room_types(name)')
        .eq('booking_id', bookingIdInput)
        .eq('hotel_id', hotel.id)
        .maybeSingle()

      if (booking) {
        const statusEmoji: Record<string, string> = {
          pending: '🟡',
          confirmed: '🟢',
          cancelled: '🔴',
          checked_in: '🔵',
          checked_out: '⚪',
        }
        const statusLabels: Record<string, string> = {
          pending: 'Pending Confirmation',
          confirmed: 'Confirmed',
          cancelled: 'Cancelled',
          checked_in: 'Checked In',
          checked_out: 'Checked Out',
        }
        
        response = `📋 *Booking Details*\n\n`
        response += `━━━━━━━━━━━━━━━\n`
        response += `🆔 Booking ID: *${booking.booking_id}*\n`
        response += `━━━━━━━━━━━━━━━\n\n`
        response += `📌 Status: ${statusEmoji[booking.status || 'pending']} *${statusLabels[booking.status || 'pending']}*\n\n`
        response += `🏨 Room: ${(booking.room_types as { name: string })?.name || 'N/A'}\n`
        response += `👤 Guest: ${booking.guest_name}\n`
        response += `📅 Check-in: ${booking.check_in_date}\n`
        response += `📅 Check-out: ${booking.check_out_date}\n`
        response += `👥 Guests: ${booking.adults} Adults, ${booking.children || 0} Children\n`
        if (booking.total_price) response += `💰 Total: ₹${booking.total_price}\n`
        if (booking.notes) response += `\n📝 Notes: ${booking.notes}\n`
        response += `\n_Reply "menu" to go back_`
      } else {
        response = `❌ Booking *${bookingIdInput}* not found.\n\nPlease check your Booking ID and try again.\n\n_Reply "menu" to go back_`
      }
      newState = 'main_menu'
    }
    // Default fallback - show menu for any unrecognized input
    else {
      response = `🤔 I didn't understand that.\n\n`
      response += `_Reply "menu" to see available options_`
      newState = 'main_menu'
    }

    // Update session
    session.state = newState
    if (existingSession?.id) {
      await supabase
        .from('automation_sessions')
        .update({ session_data: session, last_interaction_at: new Date().toISOString() })
        .eq('id', existingSession.id)
    }

    // Send response via WhatsApp
    await sendWhatsAppMessage(phone_number_id, access_token, from_phone, response)

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
