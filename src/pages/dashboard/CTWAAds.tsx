import { useState } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Target,
  Plus,
  ExternalLink,
  Copy,
  CheckCircle2,
  BarChart3,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CTWACampaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'draft';
  leads: number;
  costPerLead: number;
  clicks: number;
  platform: 'facebook' | 'instagram' | 'both';
}

const mockCampaigns: CTWACampaign[] = [
  { id: '1', name: 'Summer Sale Campaign', status: 'active', leads: 245, costPerLead: 12.5, clicks: 1890, platform: 'both' },
  { id: '2', name: 'New Product Launch', status: 'active', leads: 128, costPerLead: 18.2, clicks: 956, platform: 'facebook' },
  { id: '3', name: 'Festive Offer', status: 'paused', leads: 67, costPerLead: 22.0, clicks: 445, platform: 'instagram' },
  { id: '4', name: 'Re-engagement Flow', status: 'draft', leads: 0, costPerLead: 0, clicks: 0, platform: 'both' },
];

const stats = [
  { icon: TrendingUp, label: 'Total Leads', value: '440', change: '+32%', color: 'text-primary' },
  { icon: TrendingDown, label: 'Avg Cost/Lead', value: '₹14.2', change: '-18%', color: 'text-status-active' },
  { icon: Target, label: 'Conversion Rate', value: '23.4%', change: '+5.2%', color: 'text-primary' },
  { icon: BarChart3, label: 'Active Campaigns', value: '2', change: '', color: 'text-muted-foreground' },
];

export default function CTWAAds() {
  const { selectedNumber } = useWhatsApp();
  const [copied, setCopied] = useState(false);

  const deepLink = selectedNumber
    ? `https://wa.me/${selectedNumber.phone_number.replace(/\D/g, '')}?text=Hi%2C%20I%27m%20interested!`
    : 'https://wa.me/YOUR_NUMBER?text=Hi';

  const handleCopy = () => {
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    toast({ title: 'Link copied!', description: 'Paste this in your Meta Ads CTA URL.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-status-active/10 text-status-active';
      case 'paused': return 'bg-status-pending/10 text-status-pending';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <MousePointerClick className="h-6 w-6 text-primary" />
            Click To WhatsApp Ads
          </h1>
          <p className="text-muted-foreground mt-1">
            Boost leads by 5X and cut costs by 60% with Facebook & Instagram ads
          </p>
        </div>
        <Button variant="hero">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-foreground">{stat.value}</span>
                    {stat.change && (
                      <span className="text-xs font-medium text-status-active">{stat.change}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="setup">Quick Setup</TabsTrigger>
          <TabsTrigger value="guide">How It Works</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          {mockCampaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MousePointerClick className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={statusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">{campaign.platform}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Leads</p>
                      <p className="font-bold text-foreground">{campaign.leads}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Cost/Lead</p>
                      <p className="font-bold text-foreground">₹{campaign.costPerLead}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground text-xs">Clicks</p>
                      <p className="font-bold text-foreground">{campaign.clicks}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      View <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick CTWA Link Generator
              </CardTitle>
              <CardDescription>
                Generate a Click-to-WhatsApp deep link to use in your Facebook & Instagram ads
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your WhatsApp Deep Link</Label>
                <div className="flex gap-2">
                  <Input value={deepLink} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-status-active" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use this URL as the destination in your Meta Ads Manager CTA button
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pre-filled Message (optional)</Label>
                <Textarea
                  placeholder="Hi, I'm interested in your offer!"
                  className="resize-none"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  This message will be pre-filled when users click the ad
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How Click-to-WhatsApp Ads Work</CardTitle>
              <CardDescription>
                Follow these steps to set up your first CTWA campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    step: 1,
                    title: 'Create a Campaign in Meta Ads Manager',
                    description: 'Go to Facebook Ads Manager, create a new campaign with the "Messages" objective, and select "WhatsApp" as the messaging app.',
                  },
                  {
                    step: 2,
                    title: 'Set Your Targeting & Budget',
                    description: 'Define your audience, placement (Facebook/Instagram), and daily budget. Start with ₹500/day for testing.',
                  },
                  {
                    step: 3,
                    title: 'Use Your CTWA Deep Link',
                    description: 'Copy the deep link from the Setup tab and paste it as your ad destination URL. Customize the pre-filled message.',
                  },
                  {
                    step: 4,
                    title: 'Chat Setu Captures the Lead',
                    description: 'When users click the ad, they open WhatsApp and start chatting with your business. Chat Setu auto-captures the lead and routes it to your team.',
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
