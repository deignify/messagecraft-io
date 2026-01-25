import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { HotelBooking, RoomType, BookingStatus, BOOKING_STATUS_LABELS } from '@/lib/hotel-types';
import { Search, CalendarCheck, Phone, User, BedDouble, Calendar, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface BookingManagementProps {
  bookings: HotelBooking[];
  rooms: RoomType[];
  onUpdateStatus: (bookingId: string, status: BookingStatus) => Promise<HotelBooking>;
  onDelete: (bookingId: string) => Promise<void>;
}

export function BookingManagement({ bookings, rooms, onUpdateStatus, onDelete }: BookingManagementProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.booking_id.toLowerCase().includes(search.toLowerCase()) ||
      booking.guest_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.guest_phone.includes(search);
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    checked_in: bookings.filter(b => b.status === 'checked_in').length,
    checked_out: bookings.filter(b => b.status === 'checked_out').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  };

  const getRoomName = (roomId: string) => {
    return rooms.find(r => r.id === roomId)?.name || 'Unknown Room';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bookings</h2>
          <p className="text-muted-foreground">Manage guest bookings and update status</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['all', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'] as const).map(status => (
          <Card 
            key={status}
            className={`cursor-pointer transition-all ${statusFilter === status ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(status)}
          >
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{statusCounts[status]}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {status === 'all' ? 'Total' : status === 'checked_in' ? 'Checked In' : status === 'checked_out' ? 'Checked Out' : status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by booking ID, name, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as BookingStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {Object.entries(BOOKING_STATUS_LABELS).map(([value, { emoji, label }]) => (
              <SelectItem key={value} value={value}>
                {emoji} {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bookings Table */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {bookings.length === 0 ? 'No bookings yet. They will appear here when guests book via WhatsApp.' : 'No bookings match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map(booking => {
                    const { emoji, label } = BOOKING_STATUS_LABELS[booking.status];
                    return (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono font-medium">
                          {booking.booking_id}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {booking.guest_name}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {booking.guest_phone}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <BedDouble className="h-3 w-3" />
                            {booking.room_type?.name || getRoomName(booking.room_type_id)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(booking.check_in_date), 'dd MMM')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              to {format(new Date(booking.check_out_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {booking.adults}A, {booking.children}C
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'checked_in' ? 'secondary' :
                            booking.status === 'cancelled' ? 'destructive' :
                            'outline'
                          }>
                            {emoji} {label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={booking.status}
                              onValueChange={(v) => onUpdateStatus(booking.id, v as BookingStatus)}
                            >
                              <SelectTrigger className="w-[130px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(BOOKING_STATUS_LABELS).map(([value, { emoji, label }]) => (
                                  <SelectItem key={value} value={value}>
                                    {emoji} {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Booking?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete booking "{booking.booking_id}" for {booking.guest_name}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => onDelete(booking.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
