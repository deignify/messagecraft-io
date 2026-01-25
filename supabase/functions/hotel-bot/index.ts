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

    // Ensure we have an automation record for the Hotel Bot.
    // This is required because automation_sessions.automation_id is NOT NULL.
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

    // Get or create bot session (persisted) so numbered replies work.
    let session: BotSession = { state: 'welcome', data: {} }
    let sessionRowId: string | null = null

    if (hotelBotAutomationId) {
      // Check for existing session in automation_sessions
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
    let handled = false

    // Helper function to show main menu
    const getMainMenuResponse = () => {
      let menuText = `🏨 *${hotel.name}*\n\n`
      menuText += `Reply with a number:\n\n`
      menuText += `1️⃣ Hotel Information\n`
      menuText += `2️⃣ Room Types & Pricing\n`
      menuText += `3️⃣ Make a Booking Inquiry\n`
      menuText += `4️⃣ Hotel Address & Location\n`
      menuText += `5️⃣ Contact Us\n`
      menuText += `6️⃣ Check Booking Status\n\n`
      menuText += `_Reply 0 anytime for menu_`
      return menuText
    }

    // Helper to fetch rooms
    const fetchRooms = async () => {
      const { data: rooms } = await supabase
        .from('room_types')
        .select('*')
        .eq('hotel_id', hotel.id)
        .eq('is_available', true)
        .order('display_order')
      return rooms || []
    }

    // MAIN MENU SHORTCUTS - These work from ANY state
    // 0 = menu, 1 = hotel info, 2 = rooms, 3 = booking, 4 = location, 5 = contact, 6 = check status
    const isMenuTrigger = ['hi', 'hello', 'menu', 'start', 'hey', 'hii', '0', 'back'].includes(msg)
    
    if (isMenuTrigger) {
      response = getMainMenuResponse()
      newState = 'main_menu'
      session.data = {} // Clear any ongoing flow
      handled = true
    }
    else if (msg === '1') {
      // Hotel Information - works from any state
      response = `🏨 *${hotel.name}*\n\n`
      if (hotel.description) response += `${hotel.description}\n\n`
      if (hotel.phone) response += `📞 Phone: ${hotel.phone}\n`
      if (hotel.email) response += `📧 Email: ${hotel.email}\n`
      if (hotel.website) response += `🌐 Website: ${hotel.website}\n`
      if (hotel.reception_timing) response += `🕐 Reception: ${hotel.reception_timing}\n`
      if (hotel.languages?.length) response += `🗣️ Languages: ${hotel.languages.join(', ')}\n`
      if (hotel.cancellation_policy) response += `\n📋 *Cancellation Policy:*\n${hotel.cancellation_policy}\n`
      response += `\n_Reply 0 for menu_`
      newState = 'main_menu'
      handled = true
    }
    else if (msg === '2') {
      // View Rooms - works from any state
      const rooms = await fetchRooms()
      if (!rooms.length) {
        response = `😔 No rooms available at the moment.\n\n_Reply 0 for menu_`
      } else {
        response = `🛏️ *Room Types - ${hotel.name}*\n\n`
        rooms.forEach((room) => {
          response += `*${room.name}*\n`
          response += `₹${room.base_price || 'N/A'}/night • Max ${room.max_adults} guests`
          response += `\n\n`
        })
        response += `_Reply 3 to book, 1 for info, 0 for menu_`
      }
      newState = 'main_menu'
      handled = true
    }
    else if (msg === '3') {
      // Start Booking Inquiry - works from any state
      response = `📅 *Booking Inquiry*\n\nPlease enter your *full name*:`
      newState = 'booking_name'
      session.data = {} // Reset booking data
      handled = true
    }
    else if (msg === '4') {
      // Location - works from any state
      response = `📍 *Hotel Address & Location*\n\n`
      if (hotel.address) response += `🏨 ${hotel.address}\n\n`
      if (hotel.google_maps_link) response += `🗺️ Google Maps:\n${hotel.google_maps_link}\n\n`
      else response += `📍 Contact us for directions.\n\n`
      response += `_Reply 0 for menu_`
      newState = 'main_menu'
      handled = true
    }
    else if (msg === '5') {
      // Contact Us - works from any state
      response = `📞 *Contact Us*\n\n`
      if (hotel.phone) response += `📱 Phone: ${hotel.phone}\n`
      if (hotel.email) response += `📧 Email: ${hotel.email}\n`
      if (hotel.website) response += `🌐 Website: ${hotel.website}\n`
      if (hotel.reception_timing) response += `🕐 Reception: ${hotel.reception_timing}\n`
      response += `\n💬 You can also chat with us right here!\n`
      response += `\n_Reply 0 for menu_`
      newState = 'main_menu'
      handled = true
    }
    else if (msg === '6') {
      // Check Booking Status - works from any state
      response = `🔍 *Check Booking Status*\n\nPlease enter your Booking ID:`
      newState = 'check_booking'
      handled = true
    }
    else if (session.state === 'welcome') {
      // First time user - show menu
      response = getMainMenuResponse()
      newState = 'main_menu'
      handled = true
    }
    // Booking flow - collect guest name
    if (!handled && session.state === 'booking_name') {
      const guestName = message_text.trim()
      if (guestName.length >= 2) {
        session.data.guest_name = guestName
        response = `Thank you, *${guestName}*!\n\nPlease enter your *check-in date* (DD/MM/YYYY):`
        newState = 'booking_checkin'
        handled = true
      } else {
        response = `❌ Please enter a valid name (at least 2 characters)`
        handled = true
      }
    }
    // Booking flow - collect check-in date
    if (!handled && session.state === 'booking_checkin') {
      const dateMatch = message_text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (dateMatch) {
        let [, day, month, year] = dateMatch
        if (year.length === 2) year = '20' + year
        session.data.check_in = `${day}/${month}/${year}`
        session.data.check_in_db = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        response = `Check-in: *${day}/${month}/${year}*\n\nPlease enter your *check-out date* (DD/MM/YYYY):`
        newState = 'booking_checkout'
        handled = true
      } else {
        response = `❌ Invalid date format. Please use DD/MM/YYYY (e.g., 15/02/2026)`
        handled = true
      }
    }
    // Booking flow - collect check-out date
    if (!handled && session.state === 'booking_checkout') {
      const dateMatch = message_text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
      if (dateMatch) {
        let [, day, month, year] = dateMatch
        if (year.length === 2) year = '20' + year
        session.data.check_out = `${day}/${month}/${year}`
        session.data.check_out_db = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        response = `Check-out: *${day}/${month}/${year}*\n\nHow many *guests* will be staying?`
        newState = 'booking_guests'
        handled = true
      } else {
        response = `❌ Invalid date format. Please use DD/MM/YYYY (e.g., 17/02/2026)`
        handled = true
      }
    }
    // Booking flow - collect guests count
    if (!handled && session.state === 'booking_guests') {
      const guests = parseInt(msg)
      if (!isNaN(guests) && guests >= 1 && guests <= 20) {
        session.data.guests = guests
        response = `*${guests}* guest(s) noted.\n\nHow many *rooms* do you need?`
        newState = 'booking_rooms'
        handled = true
      } else {
        response = `❌ Please enter a valid number of guests (1-20)`
        handled = true
      }
    }
    // Booking flow - collect rooms count and show summary
    if (!handled && session.state === 'booking_rooms') {
      const rooms = parseInt(msg)
      if (!isNaN(rooms) && rooms >= 1 && rooms <= 10) {
        session.data.rooms = rooms
        response = `📋 *Booking Summary*\n\n`
        response += `👤 Name: ${session.data.guest_name}\n`
        response += `📅 Check-in: ${session.data.check_in}\n`
        response += `📅 Check-out: ${session.data.check_out}\n`
        response += `👥 Guests: ${session.data.guests}\n`
        response += `🛏️ Rooms: ${rooms}\n\n`
        response += `Reply *YES* to confirm or *CANCEL* to cancel.`
        newState = 'booking_confirm'
        handled = true
      } else {
        response = `❌ Please enter a valid number of rooms (1-10)`
        handled = true
      }
    }
    // Booking flow - confirm or cancel
    if (!handled && session.state === 'booking_confirm') {
      if (msg === 'yes' || msg === 'confirm') {
        // Generate booking ID
        const { data: bookingIdData } = await supabase.rpc('generate_booking_id', { hotel_name: hotel.name })
        const bookingId = bookingIdData || `${Math.floor(10000000 + Math.random() * 90000000)}`
        
        // Get first available room for booking record
        const roomsList = await fetchRooms()
        const firstRoom = roomsList[0]
        
        if (!firstRoom) {
          response = `❌ Sorry, no rooms available. Please contact us directly.\n\n_Reply 0 for menu_`
          newState = 'main_menu'
          session.data = {}
          handled = true
        } else {
          // Create booking
          const { error: bookingError } = await supabase.from('hotel_bookings').insert({
            hotel_id: hotel.id,
            room_type_id: firstRoom.id,
            booking_id: bookingId,
            guest_name: session.data.guest_name as string,
            guest_phone: from_phone,
            guest_whatsapp_phone: from_phone,
            check_in_date: session.data.check_in_db as string,
            check_out_date: session.data.check_out_db as string,
            adults: session.data.guests as number,
            children: 0,
            status: 'pending',
            notes: `Rooms requested: ${session.data.rooms}`,
          })

          if (bookingError) {
            console.error('Booking error:', bookingError)
            response = `❌ Sorry, there was an error. Please try again.\n\n_Reply 0 for menu_`
          } else {
            response = `✅ *Booking Request Received!*\n\n`
            response += `Thank you, *${session.data.guest_name}*!\n\n`
            response += `📋 Your Booking ID: *${bookingId}*\n`
            response += `_Save this ID to check your booking status_\n\n`
            response += `📅 Check-in: ${session.data.check_in}\n`
            response += `📅 Check-out: ${session.data.check_out}\n`
            response += `👥 Guests: ${session.data.guests}\n`
            response += `🛏️ Rooms: ${session.data.rooms}\n\n`
            response += `Our team will contact you shortly to confirm availability.\n\n`
            response += `_Reply 0 for menu_`
          }
          newState = 'main_menu'
          session.data = {} // Clear booking data
          handled = true
        }
      } else if (msg === 'cancel' || msg === 'no') {
        response = `❌ Booking cancelled.\n\n_Reply 0 for menu_`
        newState = 'main_menu'
        session.data = {}
        handled = true
      } else {
        response = `Reply *YES* to confirm or *CANCEL* to cancel.`
        handled = true
      }
    }
    // Check booking status flow
    if (!handled && session.state === 'check_booking') {
      const bookingIdInput = message_text.trim().toUpperCase()
      
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
        response += `🔖 Booking ID: *${booking.booking_id}*\n`
        response += `${statusEmoji[booking.status || 'pending']} Status: *${statusLabels[booking.status || 'pending']}*\n\n`
        response += `👤 Name: ${booking.guest_name}\n`
        response += `📅 Check-in: ${booking.check_in_date}\n`
        response += `📅 Check-out: ${booking.check_out_date}\n`
        response += `👥 Guests: ${booking.adults}\n`
        if (booking.notes) response += `🛏️ ${booking.notes}\n`
        response += `\n_For any queries, reply 5 to contact us_\n`
        response += `_Reply 0 for menu_`
      } else {
        response = `❌ Booking ID *${bookingIdInput}* not found.\n\nPlease check your ID and try again.\n\n_Reply 0 for menu_`
      }
      newState = 'main_menu'
      handled = true
    }

    // Default fallback - show menu for any unrecognized input
    if (!handled) {
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
