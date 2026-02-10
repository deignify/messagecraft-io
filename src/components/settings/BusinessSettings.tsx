import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Clock, MessageSquareReply, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, '0');
  return `${h}:00`;
});

export function BusinessSettings() {
  const { user, profile, settings, refreshProfile, updateSettings } = useAuth();
  const { toast } = useToast();

  const [companyName, setCompanyName] = useState(profile?.company_name || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCompanyName(profile?.company_name || '');
  }, [profile]);

  const handleSaveCompany = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ company_name: companyName || null })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Company name updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    const current = settings?.working_days || DAYS_OF_WEEK.slice(0, 5);
    const updated = current.includes(day)
      ? current.filter((d: string) => d !== day)
      : [...current, day];
    updateSettings({ working_days: updated } as any);
  };

  return (
    <div className="space-y-8">
      {/* Company Info */}
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Business Profile</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={settings?.timezone || 'UTC'}
              onValueChange={(value) => updateSettings({ timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Button variant="hero" onClick={handleSaveCompany} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </div>
      </section>

      {/* Working Hours */}
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <Clock className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Working Hours</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Working Hours</Label>
              <p className="text-sm text-muted-foreground">
                Auto-reply outside of working hours
              </p>
            </div>
            <Switch
              checked={settings?.working_hours_enabled ?? false}
              onCheckedChange={(checked) => updateSettings({ working_hours_enabled: checked } as any)}
            />
          </div>

          {settings?.working_hours_enabled && (
            <>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select
                    value={settings?.working_hours_start || '09:00'}
                    onValueChange={(value) => updateSettings({ working_hours_start: value } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select
                    value={settings?.working_hours_end || '18:00'}
                    onValueChange={(value) => updateSettings({ working_hours_end: value } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Working Days</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <label
                      key={day}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={(settings?.working_days || DAYS_OF_WEEK.slice(0, 5)).includes(day)}
                        onCheckedChange={() => toggleDay(day)}
                      />
                      <span className="text-sm">{day.slice(0, 3)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Outside Hours Message</Label>
                <Textarea
                  value={settings?.outside_hours_message || ''}
                  onChange={(e) => updateSettings({ outside_hours_message: e.target.value } as any)}
                  placeholder="We are currently outside of business hours..."
                  rows={2}
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Auto Replies */}
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquareReply className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Auto Replies</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto Reply</Label>
              <p className="text-sm text-muted-foreground">
                Automatically reply to new messages
              </p>
            </div>
            <Switch
              checked={settings?.auto_reply_enabled ?? false}
              onCheckedChange={(checked) => updateSettings({ auto_reply_enabled: checked } as any)}
            />
          </div>

          {settings?.auto_reply_enabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Auto Reply Message</Label>
                <Textarea
                  value={settings?.auto_reply_message || ''}
                  onChange={(e) => updateSettings({ auto_reply_message: e.target.value } as any)}
                  placeholder="Thank you for your message..."
                  rows={3}
                />
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
