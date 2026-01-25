import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Hotel, LANGUAGE_OPTIONS } from '@/lib/hotel-types';
import { Building2, Phone, Mail, Globe, MapPin, Clock, FileText, Languages, Loader2 } from 'lucide-react';

interface HotelSetupProps {
  hotel: Hotel | null;
  onCreate: (data: Partial<Hotel>) => Promise<Hotel | null>;
  onUpdate: (data: Partial<Hotel>) => Promise<Hotel | null>;
}

export function HotelSetup({ hotel, onCreate, onUpdate }: HotelSetupProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    google_maps_link: '',
    reception_timing: '24/7',
    cancellation_policy: '',
    languages: ['English'] as string[],
    is_active: true,
  });

  useEffect(() => {
    if (hotel) {
      setFormData({
        name: hotel.name || '',
        description: hotel.description || '',
        phone: hotel.phone || '',
        email: hotel.email || '',
        website: hotel.website || '',
        address: hotel.address || '',
        google_maps_link: hotel.google_maps_link || '',
        reception_timing: hotel.reception_timing || '24/7',
        cancellation_policy: hotel.cancellation_policy || '',
        languages: hotel.languages || ['English'],
        is_active: hotel.is_active,
      });
    }
  }, [hotel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (hotel) {
        await onUpdate(formData);
      } else {
        await onCreate(formData);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Hotel Information
            </CardTitle>
            <CardDescription>
              Basic details shown to guests when they message your WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Hotel Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Hotel Sunshine"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Comfortable stay near Bus Stand, Sanchore..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bot Active</Label>
                <p className="text-sm text-muted-foreground">
                  Enable/disable the hotel bot
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Details
            </CardTitle>
            <CardDescription>
              Contact information for guests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone Number
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 9XXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="info@hotelsunshine.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> Website
              </Label>
              <Input
                id="website"
                value={formData.website}
                onChange={e => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="www.hotelsunshine.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reception_timing" className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Reception Timing
              </Label>
              <Input
                id="reception_timing"
                value={formData.reception_timing}
                onChange={e => setFormData(prev => ({ ...prev, reception_timing: e.target.value }))}
                placeholder="24/7 or 8 AM - 10 PM"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
            <CardDescription>
              Address and map link for navigation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Near Bus Stand, Sanchore, Rajasthan – 343041"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="google_maps_link">Google Maps Link</Label>
              <Input
                id="google_maps_link"
                value={formData.google_maps_link}
                onChange={e => setFormData(prev => ({ ...prev, google_maps_link: e.target.value }))}
                placeholder="https://maps.google.com/..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Policies & Languages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Policies & Languages
            </CardTitle>
            <CardDescription>
              Cancellation policy and supported languages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
              <Textarea
                id="cancellation_policy"
                value={formData.cancellation_policy}
                onChange={e => setFormData(prev => ({ ...prev, cancellation_policy: e.target.value }))}
                placeholder="Free cancellation up to 24 hours before check-in..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" /> Supported Languages
              </Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => (
                  <Badge
                    key={lang}
                    variant={formData.languages.includes(lang) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" disabled={saving || !formData.name}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {hotel ? 'Update Hotel' : 'Create Hotel'}
        </Button>
      </div>
    </form>
  );
}
