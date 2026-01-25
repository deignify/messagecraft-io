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

// Helper: Parse date from various formats (10 Feb 2026, 10/02/2026, etc.)
function parseDate(input: string): { valid: boolean; date?: Date; formatted?: string; dbFormat?: string } {
  const trimmed = input.trim()
  
  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const numericMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
  if (numericMatch) {
    let [, day, month, year] = numericMatch
    if (year.length === 2) year = '20' + year
    const d = parseInt(day), m = parseInt(month) - 1, y = parseInt(year)
    const date = new Date(y, m, d)
    if (date.getDate() === d && date.getMonth() === m) {
      return {
        valid: true,
        date,
        formatted: `${day.padStart(2, '0')} ${getMonthName(m)} ${year}`,
        dbFormat: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
  }
  
  // Format: DD Mon YYYY (10 Feb 2026)
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const textMatch = trimmed.match(/^(\d{1,2})\s+([a-zA-Z]{3,9})\s+(\d{4})$/i)
  if (textMatch) {
    const [, day, monthStr, year] = textMatch
    const monthIndex = monthNames.findIndex(m => monthStr.toLowerCase().startsWith(m))
    if (monthIndex !== -1) {
      const d = parseInt(day), y = parseInt(year)
      const date = new Date(y, monthIndex, d)
      if (date.getDate() === d && date.getMonth() === monthIndex) {
        return {
          valid: true,
          date,
          formatted: `${day.padStart(2, '0')} ${getMonthName(monthIndex)} ${year}`,
          dbFormat: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }
    }
  }
  
  return { valid: false }
}

function getMonthName(monthIndex: number): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months[monthIndex] || ''
}

// Helper: Calculate nights between dates
function calculateNights(checkIn: string, checkOut: string): number {
  const inDate = new Date(checkIn)
  const outDate = new Date(checkOut)
  const diff = outDate.getTime() - inDate.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// Intent detection for free-text
function detectIntent(message: string): string | null {
  const msg = message.toLowerCase()
  if (msg.includes('price') || msg.includes('rate') || msg.includes('room') || msg.includes('tariff')) return 'rooms'
  if (msg.includes('book') || msg.includes('reserve') || msg.includes('reservation')) return 'book'
  if (msg.includes('location') || msg.includes('address') || msg.includes('direction') || msg.includes('map')) return 'location'
  if (msg.includes('call') || msg.includes('reception') || msg.includes('human') || msg.includes('help') || msg.includes('staff')) return 'reception'
  if (msg.includes('status') || msg.includes('check booking') || msg.includes('my booking')) return 'status'
  return null
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
    const originalMsg = message_text.trim()
    let response = ''
    let newState = session.state
    let imagesToSend: { url: string; caption?: string }[] = []

    // Helper function to show main menu
    const getMainMenuResponse = () => {
      let menuText = `👋 Welcome to *${hotel.name}*!\n\n`
      menuText += `How can I help you today?\n\n`
      menuText += `1️⃣ Rooms & Prices\n`
      menuText += `2️⃣ Book a Room\n`
      menuText += `3️⃣ Check Booking Status\n`
      menuText += `4️⃣ Location & Directions\n`
      menuText += `5️⃣ Talk to Reception\n\n`
      menuText += `_Reply with a number (1–5)_`
      return menuText
    }

    // Helper: Get error response
    const getErrorResponse = () => {
      return `😅 Sorry, I didn't get that.\n\nPlease reply with a valid option or\n0️⃣ Main Menu`
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

    // Format price in INR
    const formatPrice = (amount: number) => `₹${amount.toLocaleString('en-IN')}`

    // GLOBAL COMMANDS - work everywhere
    // 0 → Main Menu
    if (msg === '0' || msg === 'menu' || msg === 'main menu') {
      response = getMainMenuResponse()
      newState = 'main_menu'
      session.data = {}
    }
    // # or human → Talk to Reception
    else if (msg === '#' || msg === 'human' || msg === 'reception' || msg === 'staff' || msg === 'help') {
      response = `📞 *Reception Contact*\n\n`
      if (hotel.phone) response += `📱 ${hotel.phone}\n`
      response += `🕐 Available 24/7\n\n`
      response += `You can type your message here and our staff will respond shortly.\n\n`
      response += `_Reply 0️⃣ for Main Menu_`
      newState = 'human_handoff'
    }
    // GREETING - start fresh
    else if (['hi', 'hello', 'start', 'hey', 'hii', 'hola'].includes(msg) && session.state !== 'human_handoff') {
      response = getMainMenuResponse()
      newState = 'main_menu'
      session.data = {}
    }
    // FREE-TEXT INTENT DETECTION (only when in main_menu or welcome)
    else if ((session.state === 'main_menu' || session.state === 'welcome') && detectIntent(msg)) {
      const intent = detectIntent(msg)
      if (intent === 'rooms') {
        // Redirect to rooms
        session.state = 'main_menu'
        msg === '1' // Trigger rooms flow below
      } else if (intent === 'book') {
        response = `📝 Please enter your *full name*:`
        newState = 'booking_name'
        session.data = { guest_phone: from_phone }
      } else if (intent === 'location') {
        response = `📍 *${hotel.name}*\n\n`
        if (hotel.address) response += `🏨 ${hotel.address}\n`
        if (hotel.google_maps_link) response += `🗺️ Google Maps: ${hotel.google_maps_link}\n\n`
        response += `Reply:\n1️⃣ Call Reception\n0️⃣ Main Menu`
        newState = 'location'
      } else if (intent === 'reception') {
        response = `📞 *Reception Contact*\n\n`
        if (hotel.phone) response += `📱 ${hotel.phone}\n`
        response += `🕐 Available 24/7\n\n`
        response += `You can type your message here.\n\n_Reply 0️⃣ for Main Menu_`
        newState = 'human_handoff'
      } else if (intent === 'status') {
        response = `🔍 Please enter your Booking ID:`
        newState = 'check_booking_id'
      }
    }
    // MAIN MENU PROCESSING
    else if (session.state === 'welcome' || session.state === 'main_menu') {
      switch (msg) {
        case '1': // Rooms & Prices
          const rooms = await fetchRoomsWithPhotos()
          if (!rooms.length) {
            response = `😔 No rooms available at the moment.\n\n_Reply 0️⃣ Main Menu_`
          } else {
            response = `🛏️ *Available Room Types:*\n\n`
            rooms.forEach((room, index) => {
              const roomNum = index + 1
              const priceStr = room.base_price ? ` – from ${formatPrice(room.base_price)}/night` : ''
              response += `${roomNum}️⃣ ${room.name}${priceStr}\n`
            })
            response += `\nReply with room number\n0️⃣ Main Menu`
            session.data.rooms_cache = rooms.map((r, i) => ({ 
              index: i + 1, 
              id: r.id, 
              name: r.name, 
              base_price: r.base_price,
              max_adults: r.max_adults,
              max_children: r.max_children,
              is_ac: r.is_ac,
              amenities: r.amenities,
              description: r.description
            }))
          }
          newState = 'rooms_list'
          break
          
        case '2': // Book a Room
          response = `📝 Please enter your *full name*:`
          newState = 'booking_name'
          session.data = { guest_phone: from_phone }
          break
          
        case '3': // Check Booking Status
          response = `🔍 Please enter your Booking ID:`
          newState = 'check_booking_id'
          break
          
        case '4': // Location & Directions
          response = `📍 *${hotel.name}*\n\n`
          if (hotel.address) response += `🏨 ${hotel.address}\n`
          if (hotel.google_maps_link) response += `🗺️ Google Maps: ${hotel.google_maps_link}\n\n`
          response += `Reply:\n1️⃣ Call Reception\n0️⃣ Main Menu`
          newState = 'location'
          break
          
        case '5': // Talk to Reception
          response = `📞 *Reception Contact*\n\n`
          if (hotel.phone) response += `📱 ${hotel.phone}\n`
          response += `🕐 Available 24/7\n\n`
          response += `You can type your message here and our staff will respond shortly.\n\n`
          response += `_Reply 0️⃣ for Main Menu_`
          newState = 'human_handoff'
          break
          
        default:
          response = getMainMenuResponse()
          newState = 'main_menu'
      }
    }
    // LOCATION STATE
    else if (session.state === 'location') {
      if (msg === '1') {
        response = `📞 *Reception Contact*\n\n`
        if (hotel.phone) response += `📱 ${hotel.phone}\n`
        response += `🕐 Available 24/7\n\n_Reply 0️⃣ for Main Menu_`
        newState = 'main_menu'
      } else {
        response = getErrorResponse()
      }
    }
    // ROOMS LIST - Select room to see details
    else if (session.state === 'rooms_list') {
      const roomNum = parseInt(msg)
      const roomsCache = (session.data.rooms_cache as any[]) || []
      
      if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= roomsCache.length) {
        const selectedRoom = roomsCache.find((r: any) => r.index === roomNum)
        if (selectedRoom) {
          // Fetch photos for this room
          const { data: photos } = await supabase
            .from('room_photos')
            .select('*')
            .eq('room_type_id', selectedRoom.id)
            .order('display_order')
          
          response = `🛏️ *${selectedRoom.name}*\n\n`
          response += `👥 ${selectedRoom.max_adults || 2} Adults, ${selectedRoom.max_children || 0} Children\n`
          if (selectedRoom.is_ac) response += `❄️ Air Conditioned\n`
          response += `📶 Free Wi-Fi\n`
          response += `🚿 Attached Bathroom\n`
          
          if (selectedRoom.amenities?.length) {
            response += `\n✨ *Amenities:*\n`
            selectedRoom.amenities.forEach((a: string) => {
              response += `  • ${a}\n`
            })
          }
          
          if (selectedRoom.description) {
            response += `\n📝 ${selectedRoom.description}\n`
          }
          
          response += `\nWould you like to book this room?\n\n`
          response += `1️⃣ Yes, Book This Room\n`
          response += `0️⃣ Main Menu`
          
          // Queue photos
          if (photos?.length) {
            photos.forEach((photo: RoomPhoto, idx: number) => {
              imagesToSend.push({
                url: photo.photo_url,
                caption: idx === 0 ? `${selectedRoom.name}` : undefined
              })
            })
          }
          
          session.data.selected_room = selectedRoom
          newState = 'room_detail'
        }
      } else {
        response = getErrorResponse()
      }
    }
    // ROOM DETAIL - Book or go back
    else if (session.state === 'room_detail') {
      if (msg === '1' || msg === 'yes') {
        response = `📝 Please enter your *full name*:`
        const selectedRoom = session.data.selected_room
        session.data = { 
          guest_phone: from_phone,
          pre_selected_room: selectedRoom
        }
        newState = 'booking_name'
      } else {
        response = getErrorResponse()
      }
    }
    // ============ BOOKING FLOW ============
    // STEP 1: Customer Name
    else if (session.state === 'booking_name') {
      const nameParts = originalMsg.split(/\s+/).filter(p => p.length > 0)
      if (nameParts.length >= 2 && /^[a-zA-Z\s]+$/.test(originalMsg)) {
        session.data.guest_name = originalMsg
        response = `📅 Check-in date?\n_(Example: 10 Feb 2026)_`
        newState = 'booking_checkin'
      } else if (originalMsg.length >= 2) {
        // Accept single name if at least 2 chars
        session.data.guest_name = originalMsg
        response = `📅 Check-in date?\n_(Example: 10 Feb 2026)_`
        newState = 'booking_checkin'
      } else {
        response = `❌ Please enter a valid name (at least 2 characters)`
      }
    }
    // STEP 2: Check-in Date
    else if (session.state === 'booking_checkin') {
      const parsed = parseDate(originalMsg)
      if (parsed.valid && parsed.date) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (parsed.date >= today) {
          session.data.check_in = parsed.formatted
          session.data.check_in_db = parsed.dbFormat
          response = `📅 Check-out date?\n_(Example: 12 Feb 2026)_`
          newState = 'booking_checkout'
        } else {
          response = `❌ Check-in date must be today or a future date.\n\nPlease enter a valid date:`
        }
      } else {
        response = `❌ Invalid date format.\n\nPlease use format like: 10 Feb 2026 or 10/02/2026`
      }
    }
    // STEP 3: Check-out Date
    else if (session.state === 'booking_checkout') {
      const parsed = parseDate(originalMsg)
      if (parsed.valid && parsed.date) {
        const checkInDate = new Date(session.data.check_in_db as string)
        if (parsed.date > checkInDate) {
          session.data.check_out = parsed.formatted
          session.data.check_out_db = parsed.dbFormat
          response = `👥 Number of adults?`
          newState = 'booking_adults'
        } else {
          response = `❌ Check-out date must be after check-in date.\n\nPlease enter a valid date:`
        }
      } else {
        response = `❌ Invalid date format.\n\nPlease use format like: 12 Feb 2026 or 12/02/2026`
      }
    }
    // STEP 4: Number of Adults
    else if (session.state === 'booking_adults') {
      const adults = parseInt(msg)
      if (!isNaN(adults) && adults >= 1 && adults <= 20) {
        session.data.adults = adults
        response = `👶 Number of children?\n_(Reply 0 if none)_`
        newState = 'booking_children'
      } else {
        response = `❌ Please enter a valid number of adults (1-20)`
      }
    }
    // STEP 5: Number of Children
    else if (session.state === 'booking_children') {
      const children = parseInt(msg)
      if (!isNaN(children) && children >= 0 && children <= 10) {
        session.data.children = children
        
        // Show confirmation
        response = `🔍 Please confirm your booking details:\n\n`
        response += `👤 Name: ${session.data.guest_name}\n`
        response += `📅 Check-in: ${session.data.check_in}\n`
        response += `📅 Check-out: ${session.data.check_out}\n`
        response += `👥 Adults: ${session.data.adults}\n`
        response += `👶 Children: ${children}\n\n`
        response += `Reply:\n`
        response += `1️⃣ Confirm & Check Availability\n`
        response += `2️⃣ Edit Details\n`
        response += `0️⃣ Cancel`
        
        newState = 'booking_confirm_details'
      } else {
        response = `❌ Please enter a valid number of children (0-10)`
      }
    }
    // STEP 6: Confirm Details
    else if (session.state === 'booking_confirm_details') {
      if (msg === '1') {
        // Check availability and show rooms with prices
        const rooms = await fetchRoomsWithPhotos()
        const preSelected = session.data.pre_selected_room as any
        
        if (!rooms.length) {
          response = `❌ Sorry, no rooms available for your dates.\n\nPlease contact reception for assistance.\n\n_Reply 0️⃣ for Main Menu_`
          newState = 'main_menu'
        } else if (preSelected) {
          // Room was pre-selected, calculate price
          const nights = calculateNights(session.data.check_in_db as string, session.data.check_out_db as string)
          const totalPrice = (preSelected.base_price || 0) * nights
          
          session.data.room_id = preSelected.id
          session.data.room_name = preSelected.name
          session.data.total_price = totalPrice
          session.data.nights = nights
          
          response = `✅ Room Available!\n\n`
          response += `🛏️ ${preSelected.name}\n`
          response += `📅 ${nights} Night(s)\n`
          if (totalPrice > 0) response += `💰 Total Amount: ${formatPrice(totalPrice)}\n\n`
          response += `Reply:\n`
          response += `1️⃣ Confirm Booking\n`
          response += `2️⃣ Change Dates / Room\n`
          response += `0️⃣ Main Menu`
          
          newState = 'booking_final_confirm'
        } else {
          // Show room selection with prices
          const nights = calculateNights(session.data.check_in_db as string, session.data.check_out_db as string)
          session.data.nights = nights
          
          response = `✅ Rooms Available for ${nights} Night(s):\n\n`
          rooms.forEach((room, index) => {
            const roomNum = index + 1
            const totalPrice = (room.base_price || 0) * nights
            response += `${roomNum}️⃣ ${room.name}\n`
            response += `   👥 ${room.max_adults || 2} Adults, ${room.max_children || 0} Children\n`
            if (totalPrice > 0) response += `   💰 ${formatPrice(totalPrice)} total\n`
            response += `\n`
          })
          response += `Reply with room number (1-${rooms.length}):`
          
          session.data.available_rooms = rooms.map((r, i) => ({ 
            index: i + 1, 
            id: r.id, 
            name: r.name, 
            base_price: r.base_price 
          }))
          newState = 'booking_room_select'
        }
      } else if (msg === '2') {
        // Start over
        response = `📝 Please enter your *full name*:`
        session.data = { guest_phone: from_phone }
        newState = 'booking_name'
      } else {
        response = getErrorResponse()
      }
    }
    // STEP 6b: Room Selection (if not pre-selected)
    else if (session.state === 'booking_room_select') {
      const roomNum = parseInt(msg)
      const availableRooms = (session.data.available_rooms as any[]) || []
      
      if (!isNaN(roomNum) && roomNum >= 1 && roomNum <= availableRooms.length) {
        const selectedRoom = availableRooms.find((r: any) => r.index === roomNum)
        if (selectedRoom) {
          const nights = session.data.nights as number
          const totalPrice = (selectedRoom.base_price || 0) * nights
          
          session.data.room_id = selectedRoom.id
          session.data.room_name = selectedRoom.name
          session.data.total_price = totalPrice
          
          response = `✅ Room Available!\n\n`
          response += `🛏️ ${selectedRoom.name}\n`
          response += `📅 ${nights} Night(s)\n`
          if (totalPrice > 0) response += `💰 Total Amount: ${formatPrice(totalPrice)}\n\n`
          response += `Reply:\n`
          response += `1️⃣ Confirm Booking\n`
          response += `2️⃣ Change Dates / Room\n`
          response += `0️⃣ Main Menu`
          
          newState = 'booking_final_confirm'
        }
      } else {
        response = `❌ Invalid selection. Please enter a number between 1 and ${availableRooms.length}`
      }
    }
    // STEP 7: Final Confirmation
    else if (session.state === 'booking_final_confirm') {
      if (msg === '1' || msg === 'confirm' || msg === 'yes') {
        // Generate unique booking ID
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
          total_price: session.data.total_price as number || null,
          status: 'pending',
        })

        if (bookingError) {
          console.error('Booking error:', bookingError)
          response = `❌ Sorry, there was an error. Please try again.\n\n_Reply 0️⃣ for Main Menu_`
        } else {
          response = `🎉 *Booking Confirmed!*\n\n`
          response += `📌 Booking ID: *${bookingId}*\n\n`
          response += `Thank you, *${session.data.guest_name}*!\n`
          response += `We look forward to hosting you 😊\n\n`
          if (hotel.google_maps_link) response += `📍 Location: ${hotel.google_maps_link}\n`
          if (hotel.phone) response += `📞 Reception: ${hotel.phone}\n`
          response += `\n_Reply 0️⃣ for Main Menu_`
        }
        newState = 'main_menu'
        session.data = {}
      } else if (msg === '2') {
        // Change dates/room - restart booking
        response = `📝 Please enter your *full name*:`
        session.data = { guest_phone: from_phone }
        newState = 'booking_name'
      } else {
        response = getErrorResponse()
      }
    }
    // ============ CHECK BOOKING STATUS ============
    else if (session.state === 'check_booking_id') {
      const bookingIdInput = originalMsg.trim()
      
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
        
        response = `📄 *Booking Details:*\n\n`
        response += `🔖 Booking ID: ${booking.booking_id}\n`
        response += `${statusEmoji[booking.status || 'pending']} Status: ${statusLabels[booking.status || 'pending']}\n\n`
        if (booking.room_types?.name) response += `🛏️ ${booking.room_types.name}\n`
        response += `📅 ${booking.check_in_date} to ${booking.check_out_date}\n`
        response += `👥 ${booking.adults} Adults, ${booking.children || 0} Children\n\n`
        response += `Need help?\n`
        response += `1️⃣ Modify Booking\n`
        response += `2️⃣ Talk to Reception\n`
        response += `0️⃣ Main Menu`
        
        session.data.found_booking_id = booking.booking_id
        newState = 'booking_status_options'
      } else {
        response = `❌ Booking not found.\n\n`
        response += `1️⃣ Try another Booking ID\n`
        response += `2️⃣ Check using Mobile Number\n`
        response += `3️⃣ Talk to Reception\n`
        response += `0️⃣ Main Menu`
        newState = 'booking_not_found'
      }
    }
    // Booking Status Options
    else if (session.state === 'booking_status_options') {
      if (msg === '1') {
        response = `📞 *Reception Contact*\n\n`
        if (hotel.phone) response += `📱 ${hotel.phone}\n`
        response += `\nPlease contact us to modify your booking.\n\n_Reply 0️⃣ for Main Menu_`
        newState = 'main_menu'
      } else if (msg === '2') {
        response = `📞 *Reception Contact*\n\n`
        if (hotel.phone) response += `📱 ${hotel.phone}\n`
        response += `🕐 Available 24/7\n\n_Reply 0️⃣ for Main Menu_`
        newState = 'main_menu'
      } else {
        response = getErrorResponse()
      }
    }
    // Booking Not Found Options
    else if (session.state === 'booking_not_found') {
      if (msg === '1') {
        response = `🔍 Please enter your Booking ID:`
        newState = 'check_booking_id'
      } else if (msg === '2') {
        // Check by phone
        const { data: bookings } = await supabase
          .from('hotel_bookings')
          .select('booking_id, guest_name, check_in_date, status, room_types(name)')
          .eq('hotel_id', hotel.id)
          .or(`guest_phone.eq.${from_phone},guest_whatsapp_phone.eq.${from_phone}`)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (bookings?.length) {
          response = `📋 *Bookings found for your number:*\n\n`
          bookings.forEach((b: any) => {
            const statusEmoji: Record<string, string> = { pending: '⏳', confirmed: '✅', cancelled: '❌', checked_in: '🔵', checked_out: '✔️' }
            response += `${statusEmoji[b.status || 'pending']} *${b.booking_id}*\n`
            response += `   ${b.guest_name} | ${b.check_in_date}\n\n`
          })
          response += `_Reply 0️⃣ for Main Menu_`
        } else {
          response = `❌ No bookings found for your phone number.\n\nPlease contact reception for help.\n\n_Reply 0️⃣ for Main Menu_`
        }
        newState = 'main_menu'
      } else if (msg === '3') {
        response = `📞 *Reception Contact*\n\n`
        if (hotel.phone) response += `📱 ${hotel.phone}\n`
        response += `🕐 Available 24/7\n\n_Reply 0️⃣ for Main Menu_`
        newState = 'main_menu'
      } else {
        response = getErrorResponse()
      }
    }
    // HUMAN HANDOFF - just acknowledge
    else if (session.state === 'human_handoff') {
      response = `📩 Your message has been received. Our team will respond shortly.\n\n_Reply 0️⃣ for Main Menu_`
      // Stay in human handoff mode
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
