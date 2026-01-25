import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RoomType, AMENITY_OPTIONS } from '@/lib/hotel-types';
import { Plus, BedDouble, Users, Baby, Thermometer, Pencil, Trash2, ImagePlus, X, Loader2 } from 'lucide-react';

interface RoomManagementProps {
  rooms: RoomType[];
  onCreate: (data: Partial<RoomType>) => Promise<RoomType | null>;
  onUpdate: (roomId: string, data: Partial<RoomType>) => Promise<RoomType | null>;
  onDelete: (roomId: string) => Promise<void>;
  onUploadPhoto: (roomId: string, file: File) => Promise<unknown>;
  onDeletePhoto: (photoId: string, roomId: string) => Promise<void>;
}

const defaultRoomData = {
  name: '',
  description: '',
  max_adults: 2,
  max_children: 1,
  amenities: [] as string[],
  base_price: undefined as number | undefined,
  is_ac: true,
  is_available: true,
};

export function RoomManagement({ rooms, onCreate, onUpdate, onDelete, onUploadPhoto, onDeletePhoto }: RoomManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomType | null>(null);
  const [formData, setFormData] = useState(defaultRoomData);
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData(defaultRoomData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (room: RoomType) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      description: room.description || '',
      max_adults: room.max_adults,
      max_children: room.max_children,
      amenities: room.amenities || [],
      base_price: room.base_price,
      is_ac: room.is_ac,
      is_available: room.is_available,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingRoom) {
        await onUpdate(editingRoom.id, formData);
      } else {
        await onCreate(formData);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handlePhotoUpload = async (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFor(roomId);
    try {
      await onUploadPhoto(roomId, file);
    } finally {
      setUploadingFor(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Room Types</h2>
          <p className="text-muted-foreground">Manage your room types and photos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Room Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoom ? 'Edit Room Type' : 'Add Room Type'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Room Name *</Label>
                  <Input
                    id="room-name"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Deluxe Room"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-price">Base Price (₹)</Label>
                  <Input
                    id="base-price"
                    type="number"
                    value={formData.base_price || ''}
                    onChange={e => setFormData(prev => ({ ...prev, base_price: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder="2500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-description">Description</Label>
                <Textarea
                  id="room-description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Spacious room with modern interiors..."
                  rows={2}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="max-adults">Max Adults</Label>
                  <Input
                    id="max-adults"
                    type="number"
                    min={1}
                    value={formData.max_adults}
                    onChange={e => setFormData(prev => ({ ...prev, max_adults: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-children">Max Children</Label>
                  <Input
                    id="max-children"
                    type="number"
                    min={0}
                    value={formData.max_children}
                    onChange={e => setFormData(prev => ({ ...prev, max_children: Number(e.target.value) }))}
                  />
                </div>

                <div className="flex items-center gap-4 pt-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_ac}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, is_ac: checked }))}
                    />
                    <Label>AC</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_available}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, is_available: checked }))}
                    />
                    <Label>Available</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amenities</Label>
                <div className="flex flex-wrap gap-2">
                  {AMENITY_OPTIONS.map(amenity => (
                    <Badge
                      key={amenity}
                      variant={formData.amenities.includes(amenity) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleAmenity(amenity)}
                    >
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !formData.name}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingRoom ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BedDouble className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No room types yet. Add your first room type.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => (
            <Card key={room.id} className={!room.is_available ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {room.name}
                      {room.is_ac && <Thermometer className="h-4 w-4 text-blue-500" />}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {room.base_price ? `₹${room.base_price}/night` : 'Price not set'}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(room)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Room Type?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete "{room.name}" and all its photos. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(room.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {room.max_adults} Adults
                  </span>
                  <span className="flex items-center gap-1">
                    <Baby className="h-4 w-4" />
                    {room.max_children} Children
                  </span>
                </div>

                {room.amenities?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {room.amenities.slice(0, 4).map(amenity => (
                      <Badge key={amenity} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                    {room.amenities.length > 4 && (
                      <Badge variant="secondary" className="text-xs">
                        +{room.amenities.length - 4}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Photos */}
                <div className="space-y-2">
                  <Label className="text-sm">Photos</Label>
                  <div className="flex flex-wrap gap-2">
                    {room.photos?.map(photo => (
                      <div key={photo.id} className="relative group">
                        <img
                          src={photo.photo_url}
                          alt={room.name}
                          className="h-16 w-16 object-cover rounded"
                        />
                        <button
                          onClick={() => onDeletePhoto(photo.id, room.id)}
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="h-16 w-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                      {uploadingFor === room.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => handlePhotoUpload(room.id, e)}
                        disabled={uploadingFor === room.id}
                      />
                    </label>
                  </div>
                </div>

                {!room.is_available && (
                  <Badge variant="destructive">Unavailable</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
