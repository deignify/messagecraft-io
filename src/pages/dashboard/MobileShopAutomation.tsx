import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useMobileShop, type MobileShop, type MobileShopBranch } from '@/hooks/useMobileShop';
import {
  Smartphone, Store, MapPin, Settings, Loader2, ArrowLeft,
  Plus, Trash2, Save, ExternalLink, FileSpreadsheet, ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// ===== SHOP SETUP TAB =====
function ShopSetup({ shop, onCreateOrUpdate }: {
  shop: MobileShop | null;
  onCreateOrUpdate: (data: Partial<MobileShop>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<MobileShop>>({
    name: shop?.name || '',
    description: shop?.description || '',
    owner_phone: shop?.owner_phone || '',
    language: shop?.language || 'hinglish',
    welcome_message: shop?.welcome_message || '',
    advance_amount_min: shop?.advance_amount_min || 1000,
    advance_amount_max: shop?.advance_amount_max || 2000,
    upi_id: shop?.upi_id || '',
    google_sheet_id: shop?.google_sheet_id || '',
    agent_notify_phone: shop?.agent_notify_phone || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name) { toast.error('Shop name is required'); return; }
    setSaving(true);
    try { await onCreateOrUpdate(form); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>Configure your mobile shop bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Shop Name *</Label>
              <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Welcome Mobile" />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={form.language || 'hinglish'} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hinglish">Hinglish (Default)</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="english">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of your shop" />
          </div>
          <div className="space-y-2">
            <Label>Welcome Message (optional - default used if empty)</Label>
            <Textarea value={form.welcome_message || ''} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))} placeholder="Custom welcome message..." rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Owner/Agent Phone (with country code)</Label>
              <Input value={form.agent_notify_phone || ''} onChange={e => setForm(f => ({ ...f, agent_notify_phone: e.target.value }))} placeholder="919876543210" />
            </div>
            <div className="space-y-2">
              <Label>UPI ID (default for all branches)</Label>
              <Input value={form.upi_id || ''} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="shop@upi" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Advance Amount Min (₹)</Label>
              <Input type="number" value={form.advance_amount_min || ''} onChange={e => setForm(f => ({ ...f, advance_amount_min: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Advance Amount Max (₹)</Label>
              <Input type="number" value={form.advance_amount_max || ''} onChange={e => setForm(f => ({ ...f, advance_amount_max: parseInt(e.target.value) || 0 }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Google Sheet</CardTitle>
          <CardDescription>Connect your Google Sheet for products, orders & branches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Google Sheet ID *</Label>
            <Input value={form.google_sheet_id || ''} onChange={e => setForm(f => ({ ...f, google_sheet_id: e.target.value }))} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
            <p className="text-xs text-muted-foreground">
              Copy the Sheet ID from the URL: docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="font-medium text-sm">📋 Required Sheet Tabs:</p>
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>• <strong>Products</strong> — Brand | Model | Variant | Color | Price | Stock | Type | Available</p>
              <p>• <strong>Orders</strong> — OrderID | Name | Phone | City | Branch | Brand | Model | Variant | Color | Price | Type | PaymentStatus | OrderStatus | Date | PickupDate | Notes</p>
              <p>• <strong>Branches</strong> — Name | Address | City | ContactPhone | UPI_ID | IsActive</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        {shop ? 'Update Shop' : 'Create Shop'}
      </Button>
    </div>
  );
}

// ===== BRANCH MANAGEMENT TAB =====
function BranchManagement({ branches, onCreate, onUpdate, onDelete }: {
  branches: MobileShopBranch[];
  onCreate: (data: Partial<MobileShopBranch>) => Promise<void>;
  onUpdate: (id: string, data: Partial<MobileShopBranch>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<MobileShopBranch>>({});

  const handleAdd = async () => {
    if (!form.name) { toast.error('Branch name required'); return; }
    await onCreate(form);
    setForm({});
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Branches ({branches.length})</h3>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'default'} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Branch
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Branch Name *</Label>
                <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Main Branch" />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Mumbai" />
              </div>
              <div className="space-y-1">
                <Label>Address</Label>
                <Input value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Shop No. 5, Market Road" />
              </div>
              <div className="space-y-1">
                <Label>Contact Phone</Label>
                <Input value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="919876543210" />
              </div>
              <div className="space-y-1">
                <Label>UPI ID (branch-specific)</Label>
                <Input value={form.upi_id || ''} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="branch@upi" />
              </div>
            </div>
            <Button onClick={handleAdd} size="sm"><Save className="h-4 w-4 mr-1" /> Save Branch</Button>
          </CardContent>
        </Card>
      )}

      {branches.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No branches yet. Add your first branch above.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {branches.map(branch => (
            <Card key={branch.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-sm text-muted-foreground">{branch.address}, {branch.city}</p>
                    {branch.upi_id && <p className="text-xs text-muted-foreground mt-1">UPI: {branch.upi_id}</p>}
                    {branch.contact_phone && <p className="text-xs text-muted-foreground">Phone: {branch.contact_phone}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                      {branch.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(branch.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <p>💡 Branches can also be managed from your Google Sheet (Branches tab). Changes sync automatically when a customer interacts with the bot.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== DUMMY SHEET INFO =====
function SheetTemplate() {
  const dummySheetUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Google Sheet Template</CardTitle>
          <CardDescription>Create a copy of this template and paste the Sheet ID in settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" asChild>
            <a href={dummySheetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> Open Template Sheet
            </a>
          </Button>
          <p className="text-sm text-muted-foreground">
            Or create your own sheet with the following tabs:
          </p>
        </CardContent>
      </Card>

      {/* Products Sheet Structure */}
      <Card>
        <CardHeader><CardTitle className="text-base">📱 Products Tab</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  {['Brand', 'Model', 'Variant', 'Color', 'Price', 'Stock', 'Type', 'Available'].map(h => (
                    <th key={h} className="border p-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Apple', 'iPhone 16', '128GB', 'Black', '79900', '5', 'new', 'Yes'],
                  ['Apple', 'iPhone 16', '256GB', 'Blue', '89900', '3', 'new', 'Yes'],
                  ['Apple', 'iPhone 16 Pro', '256GB', 'Natural Titanium', '119900', '2', 'new', 'Yes'],
                  ['Samsung', 'Galaxy S24', '128GB', 'Phantom Black', '74999', '4', 'new', 'Yes'],
                  ['Samsung', 'Galaxy S24', '256GB', 'Cream', '79999', '3', 'new', 'Yes'],
                  ['Vivo', 'V30', '128GB', 'Peacock Green', '33999', '6', 'new', 'Yes'],
                  ['Apple', 'iPhone 15', '128GB', 'Black', '55000', '2', 'secondhand', 'Yes'],
                  ['Samsung', 'Galaxy S23', '128GB', 'Lavender', '35000', '1', 'secondhand', 'Yes'],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => <td key={j} className="border p-2">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Orders Sheet Structure */}
      <Card>
        <CardHeader><CardTitle className="text-base">🛒 Orders Tab</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  {['OrderID', 'Name', 'Phone', 'City', 'Branch', 'Brand', 'Model', 'Variant', 'Color', 'Price', 'Type', 'PaymentStatus', 'OrderStatus', 'Date', 'PickupDate', 'Notes'].map(h => (
                    <th key={h} className="border p-2 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {['ORD-ABC123', 'Rahul', '919876543210', 'Mumbai', 'Andheri Branch', 'Apple', 'iPhone 16', '128GB', 'Black', '79900', 'new', 'Verified', 'Confirmed', '2026-02-14', '15/02/2026', ''].map((cell, j) => (
                    <td key={j} className="border p-2 whitespace-nowrap">{cell}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Branches Sheet Structure */}
      <Card>
        <CardHeader><CardTitle className="text-base">🏪 Branches Tab</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-muted">
                  {['Name', 'Address', 'City', 'ContactPhone', 'UPI_ID', 'IsActive'].map(h => (
                    <th key={h} className="border p-2 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Main Branch', 'Shop 1, Market Road', 'Mumbai', '919876543210', 'main@upi', 'Yes'],
                  ['Andheri Branch', 'Shop 5, Link Road', 'Mumbai', '919876543211', 'andheri@upi', 'Yes'],
                  ['Thane Branch', 'Shop 3, Station Road', 'Thane', '919876543212', 'thane@upi', 'Yes'],
                  ['Pune Branch', 'Shop 7, FC Road', 'Pune', '919876543213', 'pune@upi', 'Yes'],
                  ['Navi Mumbai', 'Shop 2, Sector 17', 'Navi Mumbai', '919876543214', 'navimumbai@upi', 'Yes'],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => <td key={j} className="border p-2">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function MobileShopAutomation() {
  const { selectedNumber } = useWhatsApp();
  const { shop, branches, loading, createShop, updateShop, createBranch, updateBranch, deleteBranch } = useMobileShop();
  const [activeTab, setActiveTab] = useState('setup');

  if (!selectedNumber) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Smartphone className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No WhatsApp Number Selected</h2>
        <p className="text-muted-foreground max-w-md">
          Please connect and select a WhatsApp number first.
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
          <h1 className="text-2xl font-bold">📱 Mobile Shop Automation</h1>
          <p className="text-muted-foreground">
            WhatsApp bot for mobile sales with Google Sheets integration
          </p>
        </div>
        {shop && (
          <div className="ml-auto flex items-center gap-2">
            <Switch
              checked={shop.is_active || false}
              onCheckedChange={async (checked) => {
                await updateShop({ is_active: checked });
              }}
            />
            <span className="text-sm">{shop.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="setup" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Setup</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2" disabled={!shop}>
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Branches</span>
          </TabsTrigger>
          <TabsTrigger value="sheet" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Sheet Template</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <ShopSetup
            shop={shop}
            onCreateOrUpdate={shop ? updateShop : createShop}
          />
        </TabsContent>
        <TabsContent value="branches">
          <BranchManagement
            branches={branches}
            onCreate={createBranch}
            onUpdate={updateBranch}
            onDelete={deleteBranch}
          />
        </TabsContent>
        <TabsContent value="sheet">
          <SheetTemplate />
        </TabsContent>
      </Tabs>
    </div>
  );
}
