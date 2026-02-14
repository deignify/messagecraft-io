import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Building2, 
  Stethoscope, 
  Store, 
  Utensils,
  GraduationCap,
  Car,
  Plus,
  Settings,
  Loader2,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AutomationType {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  available: boolean;
}

const automationTypes: AutomationType[] = [
  {
    id: 'hotel',
    name: 'Hotel Automation',
    description: 'Complete WhatsApp bot for hotel bookings, room info, guest management, and check-in/checkout reminders',
    icon: Building2,
    path: '/dashboard/automation/hotel',
    color: 'bg-blue-500',
    available: true,
  },
  {
    id: 'mobile-shop',
    name: 'Mobile Shop',
    description: 'WhatsApp bot for mobile sales — browse brands, models, variants, place orders with Google Sheets integration',
    icon: Store,
    path: '/dashboard/automation/mobile-shop',
    color: 'bg-emerald-500',
    available: true,
  },
  {
    id: 'hospital',
    name: 'Hospital Automation',
    description: 'Appointment booking, doctor info, patient reminders, and medical inquiry management',
    icon: Stethoscope,
    path: '/dashboard/automation/hospital',
    color: 'bg-red-500',
    available: false,
  },
  {
    id: 'retail',
    name: 'Retail Store',
    description: 'Product catalog, order tracking, inventory updates, and customer support automation',
    icon: Store,
    path: '/dashboard/automation/retail',
    color: 'bg-purple-500',
    available: false,
  },
  {
    id: 'restaurant',
    name: 'Restaurant',
    description: 'Menu sharing, table reservations, order status, and delivery tracking',
    icon: Utensils,
    path: '/dashboard/automation/restaurant',
    color: 'bg-orange-500',
    available: false,
  },
  {
    id: 'education',
    name: 'Education',
    description: 'Course info, enrollment, class schedules, and student communication',
    icon: GraduationCap,
    path: '/dashboard/automation/education',
    color: 'bg-green-500',
    available: false,
  },
  {
    id: 'automotive',
    name: 'Car Dealership',
    description: 'Vehicle info, test drive booking, service appointments, and inquiry handling',
    icon: Car,
    path: '/dashboard/automation/automotive',
    color: 'bg-gray-500',
    available: false,
  },
];

export default function Automation() {
  const { selectedNumber } = useWhatsApp();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch automations for this WhatsApp number
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['automations', selectedNumber?.id],
    queryFn: async () => {
      if (!selectedNumber) return [];
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNumber,
  });

  // Check if hotel is configured
  const { data: hotel } = useQuery({
    queryKey: ['hotel', selectedNumber?.id],
    queryFn: async () => {
      if (!selectedNumber) return null;
      const { data, error } = await supabase
        .from('hotels')
        .select('id, name, is_active')
        .eq('whatsapp_number_id', selectedNumber.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNumber,
  });

  // Check if mobile shop is configured
  const { data: mobileShop } = useQuery({
    queryKey: ['mobile_shop', selectedNumber?.id],
    queryFn: async () => {
      if (!selectedNumber) return null;
      const { data, error } = await supabase
        .from('mobile_shops')
        .select('id, name, is_active')
        .eq('whatsapp_number_id', selectedNumber.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedNumber,
  });

  // Toggle hotel active status
  const toggleHotelMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!hotel) throw new Error('No hotel configured');
      const { error } = await supabase
        .from('hotels')
        .update({ is_active: isActive })
        .eq('id', hotel.id);
      if (error) throw error;
    },
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['hotel', selectedNumber?.id] });
      toast.success(isActive ? 'Hotel automation activated' : 'Hotel automation deactivated');
    },
    onError: () => {
      toast.error('Failed to update automation status');
    },
  });

  // Toggle mobile shop active status
  const toggleShopMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!mobileShop) throw new Error('No shop configured');
      const { error } = await supabase
        .from('mobile_shops')
        .update({ is_active: isActive })
        .eq('id', mobileShop.id);
      if (error) throw error;
    },
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['mobile_shop', selectedNumber?.id] });
      toast.success(isActive ? 'Shop automation activated' : 'Shop automation deactivated');
    },
    onError: () => {
      toast.error('Failed to update automation status');
    },
  });

  if (!selectedNumber) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <Zap className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No WhatsApp Number Selected</h2>
        <p className="text-muted-foreground max-w-md mb-4">
          Connect and select a WhatsApp number to set up automations.
        </p>
        <Button asChild>
          <Link to="/dashboard/numbers">Connect WhatsApp</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getAutomationStatus = (type: AutomationType) => {
    if (type.id === 'hotel' && hotel) {
      return { configured: true, active: hotel.is_active, name: hotel.name };
    }
    if (type.id === 'mobile-shop' && mobileShop) {
      return { configured: true, active: mobileShop.is_active, name: mobileShop.name };
    }
    return { configured: false, active: false };
  };

  const handleToggle = (typeId: string, checked: boolean) => {
    if (typeId === 'hotel') toggleHotelMutation.mutate(checked);
    if (typeId === 'mobile-shop') toggleShopMutation.mutate(checked);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">⚡ Automations</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Set up industry-specific WhatsApp bots for your business
        </p>
      </div>

      {/* Active Automation Summary */}
      {hotel?.is_active && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{hotel.name}</p>
                  <p className="text-sm text-muted-foreground">Hotel Bot is active and responding</p>
                </div>
              </div>
              <Badge variant="default" className="bg-primary">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automation Types Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {automationTypes.map((type) => {
          const status = getAutomationStatus(type);
          const Icon = type.icon;
          
          return (
            <Card 
              key={type.id} 
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-md",
                !type.available && "opacity-60"
              )}
            >
              {!type.available && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-3 right-3 text-xs"
                >
                  Coming Soon
                </Badge>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0",
                    type.color
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <CardDescription className="text-sm mt-1 line-clamp-2">
                      {type.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {type.available ? (
                  <div className="flex items-center justify-between">
                    {status.configured ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={status.active}
                            onCheckedChange={(checked) => handleToggle(type.id, checked)}
                            disabled={toggleHotelMutation.isPending || toggleShopMutation.isPending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {status.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={type.path}>
                            <Settings className="h-4 w-4 mr-1" />
                            Manage
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button className="w-full" asChild>
                        <Link to={type.path}>
                          <Plus className="h-4 w-4 mr-2" />
                          Set Up
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Not available yet</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">How Automations Work</p>
              <p className="text-sm text-muted-foreground mt-1">
                When activated, automations handle incoming WhatsApp messages automatically. 
                Only <strong>one automation</strong> can be active at a time per WhatsApp number 
                to prevent conflicts. Each automation type has its own specialized conversation 
                flow designed for that industry.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
