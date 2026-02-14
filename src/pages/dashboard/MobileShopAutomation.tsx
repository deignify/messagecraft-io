import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useMobileShop, type MobileShop } from '@/hooks/useMobileShop';
import { useMobileShopSheet, type SheetBranch, type SheetProduct, type SheetOrder } from '@/hooks/useMobileShopSheet';
import {
  Smartphone, Store, MapPin, Settings, Loader2, ArrowLeft,
  Save, FileSpreadsheet, RefreshCw, Package, ShoppingCart, MessageCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// ===== SHOP SETUP TAB =====
function ShopSetup({ shop, onCreateOrUpdate, onSyncToSheet }: {
  shop: MobileShop | null;
  onCreateOrUpdate: (data: Partial<MobileShop>) => Promise<void>;
  onSyncToSheet: () => Promise<void>;
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
  const [syncing, setSyncing] = useState(false);

  const handleSave = async () => {
    if (!form.name) { toast.error('Shop name is required'); return; }
    setSaving(true);
    try {
      await onCreateOrUpdate(form);
    } finally { setSaving(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await handleSave();
      await onSyncToSheet();
    } finally { setSyncing(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shop Details</CardTitle>
          <CardDescription>Configure your mobile shop bot. Save & sync to auto-fill ShopDetails sheet.</CardDescription>
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
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
          </div>
          <div className="space-y-2">
            <Label>Welcome Message</Label>
            <Textarea value={form.welcome_message || ''} onChange={e => setForm(f => ({ ...f, welcome_message: e.target.value }))} placeholder="Custom welcome message..." rows={3} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Owner/Agent Phone</Label>
              <Input value={form.agent_notify_phone || ''} onChange={e => setForm(f => ({ ...f, agent_notify_phone: e.target.value }))} placeholder="919876543210" />
            </div>
            <div className="space-y-2">
              <Label>UPI ID (default)</Label>
              <Input value={form.upi_id || ''} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} placeholder="shop@upi" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Advance Min (₹)</Label>
              <Input type="number" value={form.advance_amount_min || ''} onChange={e => setForm(f => ({ ...f, advance_amount_min: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-2">
              <Label>Advance Max (₹)</Label>
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
              From URL: docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {shop ? 'Update Shop' : 'Create Shop'}
        </Button>
        {shop && shop.google_sheet_id && (
          <Button onClick={handleSync} disabled={syncing} variant="secondary">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync to Sheet
          </Button>
        )}
      </div>
    </div>
  );
}

// ===== BRANCHES TAB (from Google Sheet) =====
function BranchesTab({ branches, loading, onRefresh }: {
  branches: SheetBranch[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Branches from Google Sheet ({branches.length})</h3>
        <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : branches.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No branches found. Add branches in your Google Sheet "Branches" tab.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>UPI</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.address}</TableCell>
                      <TableCell>{b.city}</TableCell>
                      <TableCell>{b.contact_phone}</TableCell>
                      <TableCell className="text-xs">{b.upi_id}</TableCell>
                      <TableCell>
                        <Badge variant={b.is_active.toLowerCase() === 'yes' ? 'default' : 'secondary'}>
                          {b.is_active}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          💡 Manage branches directly in your Google Sheet "Branches" tab. Click Refresh to see latest data.
        </CardContent>
      </Card>
    </div>
  );
}

// ===== PRODUCTS TAB (with pagination) =====
function ProductsTab({ products, loading, onRefresh }: {
  products: SheetProduct[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const perPage = 15;

  const filtered = products.filter(p => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return p.brand.toLowerCase().includes(q) || p.model.toLowerCase().includes(q) ||
      p.variant.toLowerCase().includes(q) || p.type.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold">Products ({filtered.length})</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <Input placeholder="Search brand, model..." value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="max-w-xs" />
          <Button onClick={onRefresh} disabled={loading} variant="outline" size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No products found. Add products in your Google Sheet "Products" tab.</p>
        </CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{p.brand}</TableCell>
                        <TableCell>{p.model}</TableCell>
                        <TableCell>{p.variant}</TableCell>
                        <TableCell>{p.color}</TableCell>
                        <TableCell>₹{parseInt(p.price).toLocaleString('en-IN')}</TableCell>
                        <TableCell>{p.stock}</TableCell>
                        <TableCell>
                          <Badge variant={p.type.toLowerCase() === 'new' ? 'default' : 'secondary'}>
                            {p.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.available.toLowerCase() === 'yes' ? 'default' : 'destructive'}>
                            {p.available}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== ORDERS TAB =====
function OrdersTab({ orders, loading, onRefresh, onUpdateOrder }: {
  orders: SheetOrder[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateOrder: (rowIndex: number, values: string[]) => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const perPage = 10;

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.order_status.toLowerCase() !== statusFilter) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return o.order_id.toLowerCase().includes(q) || o.name.toLowerCase().includes(q) ||
      o.phone.includes(q) || o.brand.toLowerCase().includes(q) || o.model.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleStatusChange = async (order: SheetOrder, newStatus: string) => {
    const values = [
      order.order_id, order.name, order.phone, order.city, order.branch,
      order.brand, order.model, order.variant, order.color, order.price,
      order.type, order.payment_status, newStatus, order.date, order.pickup_date, order.notes
    ];
    await onUpdateOrder(order.index, values);
  };

  const handlePaymentChange = async (order: SheetOrder, newPayment: string) => {
    const values = [
      order.order_id, order.name, order.phone, order.city, order.branch,
      order.brand, order.model, order.variant, order.color, order.price,
      order.type, newPayment, order.order_status, order.date, order.pickup_date, order.notes
    ];
    await onUpdateOrder(order.index, values);
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'confirmed' || s === 'delivered') return 'default';
    if (s === 'pending') return 'secondary';
    if (s === 'cancelled') return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-lg font-semibold">Orders ({filtered.length})</h3>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search order, name, phone..." value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} className="max-w-[200px]" />
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={onRefresh} disabled={loading} variant="outline" size="icon">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No orders found.</p>
        </CardContent></Card>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((o, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{o.order_id}</span>
                        <Badge variant={getStatusColor(o.order_status)}>{o.order_status || 'Pending'}</Badge>
                        <Badge variant={o.payment_status.toLowerCase() === 'verified' ? 'default' : 'secondary'}>
                          💰 {o.payment_status || 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm">{o.brand} {o.model} {o.variant} - {o.color}</p>
                      <p className="text-sm text-muted-foreground">
                        👤 {o.name} | 📞 {o.phone} | 🏙️ {o.city}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        🏪 {o.branch} | ₹{parseInt(o.price || '0').toLocaleString('en-IN')} | {o.type}
                      </p>
                      {o.date && <p className="text-xs text-muted-foreground">📅 {o.date} {o.pickup_date ? `| Pickup: ${o.pickup_date}` : ''}</p>}
                      {o.notes && <p className="text-xs text-muted-foreground italic">📝 {o.notes}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Select defaultValue={o.order_status || 'Pending'} onValueChange={v => handleStatusChange(o, v)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Confirmed">Confirmed</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select defaultValue={o.payment_status || 'Pending'} onValueChange={v => handlePaymentChange(o, v)}>
                        <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Received">Received</SelectItem>
                          <SelectItem value="Verified">Verified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== COMMUNICATION TAB =====
function CommunicationTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp Bot Communication</CardTitle>
          <CardDescription>How the bot communicates with customers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">1️⃣ Welcome & Type Selection</p>
              <p className="text-xs text-muted-foreground">Customer gets interactive buttons: New Phone, Second Hand, Search</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">2️⃣ Brand → Model → Variant Selection</p>
              <p className="text-xs text-muted-foreground">Interactive lists pulled from Products sheet with availability & pricing</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">3️⃣ Branch Selection</p>
              <p className="text-xs text-muted-foreground">Customer picks pickup branch from Branches sheet</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">4️⃣ Customer Info Collection</p>
              <p className="text-xs text-muted-foreground">Name, city, pickup date collected via conversation</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">5️⃣ Order Confirmation & Payment</p>
              <p className="text-xs text-muted-foreground">Order summary shown, advance payment via UPI/QR, screenshot verification</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium text-sm">6️⃣ Agent Notification</p>
              <p className="text-xs text-muted-foreground">Agent gets WhatsApp notification with order details for manual verification</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">💬 Bot Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span className="font-mono">hi / hello / start / menu / 0</span>
              <span className="text-muted-foreground">Reset to main menu</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span className="font-mono">new / naya</span>
              <span className="text-muted-foreground">Browse new phones</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span className="font-mono">secondhand / purana</span>
              <span className="text-muted-foreground">Browse second-hand</span>
            </div>
            <div className="flex justify-between p-2 bg-muted/30 rounded">
              <span className="font-mono">search [model name]</span>
              <span className="text-muted-foreground">Search specific model</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function MobileShopAutomation() {
  const { selectedNumber } = useWhatsApp();
  const { shop, loading, createShop, updateShop } = useMobileShop();
  const {
    branches: sheetBranches, products: sheetProducts, orders: sheetOrders,
    loading: sheetLoading, syncShopDetails, fetchBranches, fetchProducts, fetchOrders, updateOrder
  } = useMobileShopSheet();
  const [activeTab, setActiveTab] = useState('setup');

  // Auto-fetch data when tab changes
  useEffect(() => {
    if (!shop?.google_sheet_id) return;
    if (activeTab === 'branches') fetchBranches();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab, shop?.google_sheet_id]);

  if (!selectedNumber) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Smartphone className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No WhatsApp Number Selected</h2>
        <p className="text-muted-foreground max-w-md">Please connect and select a WhatsApp number first.</p>
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
          <Link to="/dashboard/automation"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">📱 Mobile Shop Automation</h1>
          <p className="text-muted-foreground">WhatsApp bot with Google Sheets integration</p>
        </div>
        {shop && (
          <div className="ml-auto flex items-center gap-2">
            <Switch
              checked={shop.is_active || false}
              onCheckedChange={async (checked) => { await updateShop({ is_active: checked }); }}
            />
            <span className="text-sm">{shop.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="setup" className="gap-1">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Shop Details</span>
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-1" disabled={!shop}>
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Branches</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1" disabled={!shop}>
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-1" disabled={!shop}>
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="communication" className="gap-1">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Communication</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup">
          <ShopSetup
            shop={shop}
            onCreateOrUpdate={shop ? updateShop : createShop}
            onSyncToSheet={syncShopDetails}
          />
        </TabsContent>
        <TabsContent value="branches">
          <BranchesTab branches={sheetBranches} loading={sheetLoading} onRefresh={fetchBranches} />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab products={sheetProducts} loading={sheetLoading} onRefresh={fetchProducts} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab orders={sheetOrders} loading={sheetLoading} onRefresh={fetchOrders} onUpdateOrder={updateOrder} />
        </TabsContent>
        <TabsContent value="communication">
          <CommunicationTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
