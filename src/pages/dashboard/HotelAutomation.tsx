import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useHotel } from '@/hooks/useHotel';
import { HotelSetup } from '@/components/hotel/HotelSetup';
import { RoomManagement } from '@/components/hotel/RoomManagement';
import { BookingManagement } from '@/components/hotel/BookingManagement';
import { OfferManagement } from '@/components/hotel/OfferManagement';
import { HotelBotPreview } from '@/components/hotel/HotelBotPreview';
import { Building2, BedDouble, CalendarCheck, Megaphone, MessageSquare, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HotelAutomation() {
  const { selectedNumber } = useWhatsApp();
  const { hotel, rooms, bookings, offers, loading, refetch, ...hotelActions } = useHotel();
  const [activeTab, setActiveTab] = useState('setup');

  if (!selectedNumber) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No WhatsApp Number Selected</h2>
        <p className="text-muted-foreground max-w-md">
          Please connect and select a WhatsApp number first to set up hotel automation.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/automation">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">🏨 Hotel Automation</h1>
          <p className="text-muted-foreground">
            Complete WhatsApp bot for hotel bookings, room info, and guest management
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="setup" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Hotel Info</span>
          </TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2" disabled={!hotel}>
            <BedDouble className="h-4 w-4" />
            <span className="hidden sm:inline">Rooms</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-2" disabled={!hotel}>
            <CalendarCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="offers" className="gap-2" disabled={!hotel}>
            <Megaphone className="h-4 w-4" />
            <span className="hidden sm:inline">Offers</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2" disabled={!hotel}>
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Preview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <HotelSetup 
            hotel={hotel} 
            onCreate={hotelActions.createHotel} 
            onUpdate={hotelActions.updateHotel} 
          />
        </TabsContent>

        <TabsContent value="rooms">
          <RoomManagement
            rooms={rooms}
            onCreate={hotelActions.createRoom}
            onUpdate={hotelActions.updateRoom}
            onDelete={hotelActions.deleteRoom}
            onUploadPhoto={hotelActions.uploadRoomPhoto}
            onDeletePhoto={hotelActions.deleteRoomPhoto}
          />
        </TabsContent>

        <TabsContent value="bookings">
          <BookingManagement
            bookings={bookings}
            rooms={rooms}
            onUpdateStatus={hotelActions.updateBookingStatus}
            onDelete={hotelActions.deleteBooking}
          />
        </TabsContent>

        <TabsContent value="offers">
          <OfferManagement
            offers={offers}
            onCreate={hotelActions.createOffer}
            onDelete={hotelActions.deleteOffer}
          />
        </TabsContent>

        <TabsContent value="preview">
          <HotelBotPreview hotel={hotel} rooms={rooms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
