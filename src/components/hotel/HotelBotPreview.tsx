import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hotel, RoomType } from '@/lib/hotel-types';
import { MessageSquare, RotateCcw, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface HotelBotPreviewProps {
  hotel: Hotel | null;
  rooms: RoomType[];
}

type Message = {
  type: 'bot' | 'user';
  content: string;
  options?: string[];
};

type Step = 'welcome' | 'main_menu' | 'hotel_info' | 'room_list' | 'room_detail' | 
            'booking_name' | 'booking_checkin' | 'booking_checkout' | 'booking_adults' | 
            'booking_children' | 'booking_room' | 'booking_confirm' |
            'status_check' | 'contact' | 'location';

export function HotelBotPreview({ hotel, rooms }: HotelBotPreviewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [step, setStep] = useState<Step>('welcome');
  const [userInput, setUserInput] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [bookingData, setBookingData] = useState({
    name: '',
    checkIn: '',
    checkOut: '',
    adults: 0,
    children: 0,
    roomId: '',
  });

  const resetChat = () => {
    setMessages([]);
    setStep('welcome');
    setSelectedRoom(null);
    setBookingData({ name: '', checkIn: '', checkOut: '', adults: 0, children: 0, roomId: '' });
    setTimeout(() => sendWelcome(), 100);
  };

  const addBotMessage = (content: string, options?: string[]) => {
    setMessages(prev => [...prev, { type: 'bot', content, options }]);
  };

  const addUserMessage = (content: string) => {
    setMessages(prev => [...prev, { type: 'user', content }]);
  };

  const sendWelcome = () => {
    if (!hotel) return;
    addBotMessage(
      `🏨 *Welcome to ${hotel.name}!*\n\n${hotel.description || 'Your comfort is our priority.'}\n\nHow can I help you today?`,
      ['🏨 Hotel Info', '🛏 View Rooms', '📅 Book Now', '🔍 Check Booking', '📍 Location', '📞 Contact Us']
    );
    setStep('main_menu');
  };

  const handleOption = (option: string) => {
    addUserMessage(option);

    if (step === 'main_menu') {
      if (option.includes('Hotel Info')) {
        showHotelInfo();
      } else if (option.includes('View Rooms')) {
        showRoomList();
      } else if (option.includes('Book Now')) {
        startBooking();
      } else if (option.includes('Check Booking')) {
        askBookingId();
      } else if (option.includes('Location')) {
        showLocation();
      } else if (option.includes('Contact')) {
        showContact();
      }
    } else if (step === 'room_list') {
      const roomIndex = parseInt(option.split('️⃣')[0]) - 1;
      if (rooms[roomIndex]) {
        showRoomDetail(rooms[roomIndex]);
      } else if (option.includes('Back')) {
        sendMainMenu();
      }
    } else if (step === 'room_detail') {
      if (option.includes('Book')) {
        setBookingData(prev => ({ ...prev, roomId: selectedRoom?.id || '' }));
        askBookingName();
      } else if (option.includes('Back')) {
        showRoomList();
      }
    } else if (step === 'booking_room') {
      const roomIndex = parseInt(option.split('️⃣')[0]) - 1;
      if (rooms[roomIndex]) {
        setBookingData(prev => ({ ...prev, roomId: rooms[roomIndex].id }));
        confirmBooking(rooms[roomIndex].name);
      }
    }
  };

  const handleTextInput = () => {
    if (!userInput.trim()) return;
    addUserMessage(userInput);
    const input = userInput;
    setUserInput('');

    if (step === 'booking_name') {
      setBookingData(prev => ({ ...prev, name: input }));
      askCheckIn();
    } else if (step === 'booking_checkin') {
      setBookingData(prev => ({ ...prev, checkIn: input }));
      askCheckOut();
    } else if (step === 'booking_checkout') {
      setBookingData(prev => ({ ...prev, checkOut: input }));
      askAdults();
    } else if (step === 'booking_adults') {
      setBookingData(prev => ({ ...prev, adults: parseInt(input) || 1 }));
      askChildren();
    } else if (step === 'booking_children') {
      setBookingData(prev => ({ ...prev, children: parseInt(input) || 0 }));
      if (bookingData.roomId) {
        const room = rooms.find(r => r.id === bookingData.roomId);
        confirmBooking(room?.name || 'Selected Room');
      } else {
        askRoomSelection();
      }
    } else if (step === 'status_check') {
      showBookingStatus(input);
    }
  };

  const showHotelInfo = () => {
    if (!hotel) return;
    let info = `🏨 *${hotel.name}*\n\n`;
    if (hotel.description) info += `${hotel.description}\n\n`;
    if (hotel.phone) info += `📞 ${hotel.phone}\n`;
    if (hotel.email) info += `📧 ${hotel.email}\n`;
    if (hotel.website) info += `🌐 ${hotel.website}\n`;
    if (hotel.reception_timing) info += `\n🕐 Reception: ${hotel.reception_timing}`;
    
    addBotMessage(info, ['🔙 Main Menu']);
    setStep('main_menu');
  };

  const showRoomList = () => {
    if (rooms.length === 0) {
      addBotMessage('No rooms available at the moment. Please contact us directly.', ['🔙 Main Menu']);
      setStep('main_menu');
      return;
    }

    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
    let message = '🛏 *Please select a room type:*\n\n';
    const options: string[] = [];

    rooms.forEach((room, index) => {
      const emoji = numberEmojis[index] || `${index + 1}.`;
      message += `${emoji} *${room.name}*\n`;
      if (room.base_price) message += `   ₹${room.base_price}/night\n`;
      message += '\n';
      options.push(`${emoji} ${room.name}`);
    });

    options.push('🔙 Back to Menu');
    addBotMessage(message, options);
    setStep('room_list');
  };

  const showRoomDetail = (room: RoomType) => {
    setSelectedRoom(room);
    let detail = `🏠 *${room.name}*\n\n`;
    if (room.description) detail += `${room.description}\n\n`;
    detail += `👥 Capacity: ${room.max_adults} Adults, ${room.max_children} Children\n`;
    if (room.is_ac) detail += `❄️ Air Conditioned\n`;
    if (room.base_price) detail += `💰 Price: ₹${room.base_price}/night\n`;
    
    if (room.amenities?.length > 0) {
      detail += `\n✨ *Amenities:*\n`;
      room.amenities.forEach(a => detail += `• ${a}\n`);
    }

    addBotMessage(detail, ['📅 Book This Room', '🔙 Back to Rooms']);
    setStep('room_detail');
  };

  const startBooking = () => {
    askBookingName();
  };

  const askBookingName = () => {
    addBotMessage('📝 *Let\'s start your booking!*\n\nPlease enter your *full name*:');
    setStep('booking_name');
  };

  const askCheckIn = () => {
    addBotMessage('📅 Please enter your *check-in date* (e.g., 15 Feb 2025):');
    setStep('booking_checkin');
  };

  const askCheckOut = () => {
    addBotMessage('📅 Please enter your *check-out date* (e.g., 17 Feb 2025):');
    setStep('booking_checkout');
  };

  const askAdults = () => {
    addBotMessage('👨 How many *adults*?');
    setStep('booking_adults');
  };

  const askChildren = () => {
    addBotMessage('👶 How many *children*?');
    setStep('booking_children');
  };

  const askRoomSelection = () => {
    const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣'];
    let message = '🛏 *Please select a room type:*\n\n';
    const options: string[] = [];

    rooms.filter(r => r.is_available).forEach((room, index) => {
      const emoji = numberEmojis[index] || `${index + 1}.`;
      message += `${emoji} ${room.name} - ₹${room.base_price || 'N/A'}/night\n`;
      options.push(`${emoji} ${room.name}`);
    });

    addBotMessage(message, options);
    setStep('booking_room');
  };

  const confirmBooking = (roomName: string) => {
    const bookingId = `${hotel?.name?.substring(0, 2).toUpperCase() || 'HB'}-${Math.floor(10000 + Math.random() * 90000)}`;
    
    addBotMessage(
      `✅ *Thank you for your booking request!*\n\n` +
      `🆔 Booking ID: *${bookingId}*\n` +
      `👤 Name: ${bookingData.name}\n` +
      `📅 Check-in: ${bookingData.checkIn}\n` +
      `📅 Check-out: ${bookingData.checkOut}\n` +
      `👥 Guests: ${bookingData.adults} Adults, ${bookingData.children} Children\n` +
      `🛏 Room: ${roomName}\n\n` +
      `Our team will confirm your booking shortly!`,
      ['🔙 Main Menu']
    );
    setStep('main_menu');
  };

  const askBookingId = () => {
    addBotMessage('🔍 Please enter your *Booking ID* (e.g., HS-12345):');
    setStep('status_check');
  };

  const showBookingStatus = (bookingId: string) => {
    // Simulated response
    addBotMessage(
      `📌 *Booking ID: ${bookingId}*\n\n` +
      `Status: 🟢 *Confirmed*\n` +
      `Check-in: 12 Feb 2025\n` +
      `Room: Deluxe Room\n\n` +
      `We look forward to hosting you!`,
      ['🔙 Main Menu']
    );
    setStep('main_menu');
  };

  const showLocation = () => {
    if (!hotel) return;
    let location = '📍 *Our Location*\n\n';
    if (hotel.address) location += `${hotel.address}\n\n`;
    if (hotel.google_maps_link) location += `🗺 Google Maps: ${hotel.google_maps_link}`;
    else location += 'Map link not available.';

    addBotMessage(location, ['🔙 Main Menu']);
    setStep('main_menu');
  };

  const showContact = () => {
    if (!hotel) return;
    let contact = '📞 *Contact Us*\n\n';
    if (hotel.phone) contact += `📞 Phone: ${hotel.phone}\n`;
    if (hotel.email) contact += `📧 Email: ${hotel.email}\n`;
    if (hotel.website) contact += `🌐 Website: ${hotel.website}\n`;
    if (hotel.reception_timing) contact += `\n🕐 Reception: ${hotel.reception_timing}`;

    addBotMessage(contact, ['🔙 Main Menu']);
    setStep('main_menu');
  };

  const sendMainMenu = () => {
    addBotMessage(
      'How can I help you?',
      ['🏨 Hotel Info', '🛏 View Rooms', '📅 Book Now', '🔍 Check Booking', '📍 Location', '📞 Contact Us']
    );
    setStep('main_menu');
  };

  // Start chat on mount
  useState(() => {
    if (hotel && messages.length === 0) {
      setTimeout(() => sendWelcome(), 500);
    }
  });

  if (!hotel) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Set up your hotel first to preview the bot.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Bot Preview</CardTitle>
              <CardDescription>Test how your hotel bot will respond</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetChat}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-[#0b141a] rounded-lg overflow-hidden">
            {/* Chat Header */}
            <div className="bg-[#202c33] p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#00a884] flex items-center justify-center text-white font-bold">
                {hotel.name[0]}
              </div>
              <div>
                <div className="text-white font-medium">{hotel.name}</div>
                <div className="text-xs text-gray-400">Online</div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-3">
                {messages.map((msg, index) => (
                  <div key={index}>
                    <div className={`max-w-[85%] ${msg.type === 'user' ? 'ml-auto' : ''}`}>
                      <div className={`rounded-lg px-3 py-2 text-sm ${
                        msg.type === 'user' 
                          ? 'bg-[#005c4b] text-white ml-auto' 
                          : 'bg-[#202c33] text-white'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                    {msg.options && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {msg.options.map((option, optIndex) => (
                          <Button
                            key={optIndex}
                            variant="outline"
                            size="sm"
                            className="text-xs bg-[#202c33] border-[#3b4a54] text-white hover:bg-[#3b4a54]"
                            onClick={() => handleOption(option)}
                          >
                            {option}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="bg-[#202c33] p-3 flex gap-2">
              <Input
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextInput()}
                placeholder="Type a message..."
                className="bg-[#2a3942] border-0 text-white placeholder:text-gray-400"
              />
              <Button size="icon" onClick={handleTextInput} className="bg-[#00a884] hover:bg-[#00a884]/90">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bot Features</CardTitle>
          <CardDescription>What your guests can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex gap-3">
              <div className="text-2xl">🏨</div>
              <div>
                <div className="font-medium">Hotel Information</div>
                <div className="text-muted-foreground">View hotel details, contact info, and policies</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">🛏</div>
              <div>
                <div className="font-medium">Room Browsing</div>
                <div className="text-muted-foreground">View all rooms with photos, amenities, and pricing</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">📅</div>
              <div>
                <div className="font-medium">Booking Inquiry</div>
                <div className="text-muted-foreground">Submit booking requests with auto-generated ID</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">🔍</div>
              <div>
                <div className="font-medium">Status Check</div>
                <div className="text-muted-foreground">Check booking status using booking ID</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">📍</div>
              <div>
                <div className="font-medium">Location & Maps</div>
                <div className="text-muted-foreground">Get directions with Google Maps link</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">📞</div>
              <div>
                <div className="font-medium">Contact Support</div>
                <div className="text-muted-foreground">Quick access to all contact methods</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
