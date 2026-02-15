import { useState, useEffect, useMemo } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone, isSamePhone, findDuplicates, formatPhoneE164 } from '@/lib/phone-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Search,
  Upload,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Tag,
  Loader2,
  X,
  SlidersHorizontal,
  Columns3,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const categories = ['Customer', 'Lead', 'VIP', 'Supplier', 'Partner', 'Other'];
const contactStatuses = ['active', 'inactive', 'blocked', 'archived'];
const contactSources = ['WhatsApp', 'Website', 'Referral', 'Import', 'Manual', 'Ad Campaign', 'Other'];

type ColumnKey = 'name' | 'phone' | 'email' | 'category' | 'tags' | 'status' | 'source' | 'city' | 'group' | 'created_at' | 'notes';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

const ALL_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'phone', label: 'Phone', defaultVisible: true },
  { key: 'email', label: 'Email', defaultVisible: true },
  { key: 'category', label: 'Category', defaultVisible: true },
  { key: 'tags', label: 'Tags', defaultVisible: true },
  { key: 'status', label: 'Status', defaultVisible: false },
  { key: 'source', label: 'Source', defaultVisible: false },
  { key: 'city', label: 'City', defaultVisible: false },
  { key: 'group', label: 'Group', defaultVisible: false },
  { key: 'created_at', label: 'Created', defaultVisible: false },
  { key: 'notes', label: 'Notes', defaultVisible: false },
];

// Extended contact type with new fields
interface ExtendedContact extends Contact {
  source?: string | null;
  status_field?: string | null;
  city?: string | null;
  group?: string | null;
}

export default function Contacts() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const { toast } = useToast();
  
  const [contacts, setContacts] = useState<ExtendedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ExtendedContact | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
    const saved = localStorage.getItem('contacts_visible_columns');
    if (saved) return new Set(JSON.parse(saved) as ColumnKey[]);
    return new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key));
  });

  // Advanced filters
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    source: 'all',
    city: '',
    group: '',
    tag: '',
    dateFrom: '',
    dateTo: '',
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: '',
    notes: '',
    tags: [] as string[],
    source: '',
    status: 'active',
    city: '',
    group: '',
  });
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.source !== 'all') count++;
    if (filters.city) count++;
    if (filters.group) count++;
    if (filters.tag) count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    return count;
  }, [filters]);

  // Save column visibility
  useEffect(() => {
    localStorage.setItem('contacts_visible_columns', JSON.stringify([...visibleColumns]));
  }, [visibleColumns]);

  // Fetch contacts
  useEffect(() => {
    if (!selectedNumber || !user) {
      setContacts([]);
      setLoading(false);
      return;
    }

    const fetchContacts = async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .order('name', { ascending: true });

      if (!error && data) {
        setContacts(data.map((d: any) => ({
          ...d,
          source: d.source,
          status_field: d.status,
          city: d.city,
          group: d.group,
        })) as ExtendedContact[]);
      }
      setLoading(false);
    };

    fetchContacts();
  }, [selectedNumber, user]);

  const resetForm = () => {
    setFormData({
      name: '', phone: '', email: '', category: '', notes: '', tags: [],
      source: '', status: 'active', city: '', group: '',
    });
    setNewTag('');
  };

  const handleAddContact = async () => {
    if (!selectedNumber || !user || !formData.phone) return;
    const normalizedPhone = formatPhoneE164(formData.phone);
    const existing = contacts.find((c) => isSamePhone(c.phone, normalizedPhone));
    if (existing) {
      setSaving(true);
      try {
        const mergedData: any = {
          name: formData.name || existing.name,
          email: formData.email || existing.email,
          category: formData.category || existing.category,
          notes: [existing.notes, formData.notes].filter(Boolean).join('\n') || null,
          tags: [...new Set([...(existing.tags || []), ...formData.tags])],
          source: formData.source || existing.source,
          status: formData.status || existing.status_field,
          city: formData.city || existing.city,
          group: formData.group || existing.group,
        };
        const { error } = await supabase.from('contacts').update(mergedData).eq('id', existing.id);
        if (error) throw error;
        setContacts(contacts.map((c) => c.id === existing.id ? { ...c, ...mergedData, status_field: mergedData.status } as ExtendedContact : c));
        setAddDialogOpen(false);
        resetForm();
        toast({ title: 'Contact merged with existing record' });
      } catch (error: any) {
        toast({ title: 'Error merging contact', description: error.message, variant: 'destructive' });
      } finally { setSaving(false); }
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        user_id: user.id,
        whatsapp_number_id: selectedNumber.id,
        name: formData.name || null,
        phone: normalizedPhone,
        email: formData.email || null,
        category: formData.category || null,
        notes: formData.notes || null,
        tags: formData.tags,
        source: formData.source || null,
        status: formData.status || 'active',
        city: formData.city || null,
        group: formData.group || null,
      };
      const { data, error } = await supabase.from('contacts').insert(insertData).select().single();
      if (error) throw error;
      const newContact = { ...data, source: data.source, status_field: data.status, city: data.city, group: data.group } as ExtendedContact;
      setContacts([...contacts, newContact]);
      setAddDialogOpen(false);
      resetForm();
      toast({ title: 'Contact added successfully' });
    } catch (error: any) {
      toast({ title: 'Error adding contact', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;
    setSaving(true);
    try {
      const updateData: any = {
        name: formData.name || null,
        phone: formData.phone,
        email: formData.email || null,
        category: formData.category || null,
        notes: formData.notes || null,
        tags: formData.tags,
        source: formData.source || null,
        status: formData.status || 'active',
        city: formData.city || null,
        group: formData.group || null,
      };
      const { error } = await supabase.from('contacts').update(updateData).eq('id', editingContact.id);
      if (error) throw error;
      setContacts(contacts.map((c) =>
        c.id === editingContact.id ? { ...c, ...updateData, status_field: updateData.status } : c
      ));
      setEditingContact(null);
      resetForm();
      toast({ title: 'Contact updated successfully' });
    } catch (error: any) {
      toast({ title: 'Error updating contact', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDeleteContacts = async () => {
    if (selectedContacts.size === 0) return;
    try {
      const { error } = await supabase.from('contacts').delete().in('id', Array.from(selectedContacts));
      if (error) throw error;
      setContacts(contacts.filter((c) => !selectedContacts.has(c.id)));
      setSelectedContacts(new Set());
      toast({ title: `${selectedContacts.size} contact(s) deleted` });
    } catch (error: any) {
      toast({ title: 'Error deleting contacts', description: error.message, variant: 'destructive' });
    }
  };

  const toggleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id);
    setSelectedContacts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) setSelectedContacts(new Set());
    else setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  const openEditDialog = (contact: ExtendedContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      phone: contact.phone,
      email: contact.email || '',
      category: contact.category || '',
      notes: contact.notes || '',
      tags: contact.tags || [],
      source: contact.source || '',
      status: contact.status_field || 'active',
      city: contact.city || '',
      group: contact.group || '',
    });
  };

  const toggleColumn = (key: ColumnKey) => {
    const next = new Set(visibleColumns);
    if (next.has(key)) next.delete(key); else next.add(key);
    setVisibleColumns(next);
  };

  const clearFilters = () => {
    setFilters({ category: 'all', status: 'all', source: 'all', city: '', group: '', tag: '', dateFrom: '', dateTo: '' });
  };

  // Derive unique values for filter dropdowns
  const uniqueCities = useMemo(() => [...new Set(contacts.map(c => c.city).filter(Boolean))] as string[], [contacts]);
  const uniqueGroups = useMemo(() => [...new Set(contacts.map(c => c.group).filter(Boolean))] as string[], [contacts]);
  const uniqueTags = useMemo(() => [...new Set(contacts.flatMap(c => c.tags || []))] as string[], [contacts]);

  const filteredContacts = useMemo(() => contacts.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.group?.toLowerCase().includes(q) ||
      c.source?.toLowerCase().includes(q);
    const matchesCategory = filters.category === 'all' || c.category === filters.category;
    const matchesStatus = filters.status === 'all' || c.status_field === filters.status;
    const matchesSource = filters.source === 'all' || c.source === filters.source;
    const matchesCity = !filters.city || c.city?.toLowerCase().includes(filters.city.toLowerCase());
    const matchesGroup = !filters.group || c.group?.toLowerCase().includes(filters.group.toLowerCase());
    const matchesTag = !filters.tag || c.tags?.includes(filters.tag);
    const matchesDateFrom = !filters.dateFrom || new Date(c.created_at) >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || new Date(c.created_at) <= new Date(filters.dateTo + 'T23:59:59');
    return matchesSearch && matchesCategory && matchesStatus && matchesSource && matchesCity && matchesGroup && matchesTag && matchesDateFrom && matchesDateTo;
  }), [contacts, searchQuery, filters]);

  // Detect duplicates
  const duplicateGroups = useMemo(() => findDuplicates(contacts), [contacts]);
  const duplicateCount = duplicateGroups.size;

  const handleMergeAllDuplicates = async () => {
    if (duplicateCount === 0) return;
    setSaving(true);
    try {
      for (const [, group] of duplicateGroups) {
        const [primary, ...others] = group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const mergedName = primary.name || others.find((o) => o.name)?.name || null;
        const mergedEmail = primary.email || others.find((o) => o.email)?.email || null;
        const mergedCategory = primary.category || others.find((o) => o.category)?.category || null;
        const mergedNotes = [primary.notes, ...others.map((o) => o.notes)].filter(Boolean).join('\n') || null;
        const mergedTags = [...new Set([...(primary.tags || []), ...others.flatMap((o) => o.tags || [])])];
        await supabase.from('contacts').update({ name: mergedName, email: mergedEmail, category: mergedCategory, notes: mergedNotes, tags: mergedTags }).eq('id', primary.id);
        const otherIds = others.map((o) => o.id);
        await supabase.from('contacts').delete().in('id', otherIds);
      }
      const { data } = await supabase.from('contacts').select('*').eq('whatsapp_number_id', selectedNumber!.id).order('name', { ascending: true });
      if (data) setContacts(data.map((d: any) => ({ ...d, source: d.source, status_field: d.status, city: d.city, group: d.group })) as ExtendedContact[]);
      toast({ title: `Merged ${duplicateCount} duplicate groups` });
    } catch (error: any) {
      toast({ title: 'Error merging', description: error.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const renderCellValue = (contact: ExtendedContact, col: ColumnKey) => {
    switch (col) {
      case 'name': return <span className="font-medium text-foreground">{contact.name || '—'}</span>;
      case 'phone': return <span className="text-muted-foreground">{contact.phone}</span>;
      case 'email': return <span className="text-muted-foreground">{contact.email || '—'}</span>;
      case 'category': return contact.category ? <Badge variant="secondary">{contact.category}</Badge> : <span className="text-muted-foreground">—</span>;
      case 'tags': return (
        <div className="flex gap-1 flex-wrap">
          {contact.tags?.slice(0, 2).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
          {contact.tags && contact.tags.length > 2 && <Badge variant="outline" className="text-xs">+{contact.tags.length - 2}</Badge>}
        </div>
      );
      case 'status': return contact.status_field ? (
        <Badge variant={contact.status_field === 'active' ? 'default' : 'secondary'} className="text-xs capitalize">{contact.status_field}</Badge>
      ) : <span className="text-muted-foreground">—</span>;
      case 'source': return <span className="text-muted-foreground text-sm">{contact.source || '—'}</span>;
      case 'city': return <span className="text-muted-foreground text-sm">{contact.city || '—'}</span>;
      case 'group': return <span className="text-muted-foreground text-sm">{contact.group || '—'}</span>;
      case 'created_at': return <span className="text-muted-foreground text-xs">{format(new Date(contact.created_at), 'MMM d, yyyy')}</span>;
      case 'notes': return <span className="text-muted-foreground text-xs truncate max-w-[150px] block">{contact.notes || '—'}</span>;
      default: return '—';
    }
  };

  if (!selectedNumber) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No WhatsApp number selected</h2>
          <p className="text-muted-foreground">Please select or connect a WhatsApp number to manage contacts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your WhatsApp contacts and organize them by categories</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4" />Import CSV</Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={() => resetForm()}><Plus className="h-4 w-4" />Add Contact</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>Add a new contact to your WhatsApp number.</DialogDescription>
              </DialogHeader>
              <ContactForm formData={formData} setFormData={setFormData} newTag={newTag} setNewTag={setNewTag} addTag={addTag} removeTag={removeTag} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button variant="hero" onClick={handleAddContact} disabled={saving || !formData.phone}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Contact'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Filter Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search contacts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          <Button variant={showFilters ? 'default' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">{activeFilterCount}</Badge>
            )}
          </Button>

          {/* Column Visibility */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Columns3 className="h-4 w-4" />
                Columns
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" align="end">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">Toggle columns</p>
              {ALL_COLUMNS.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm">
                  <Checkbox checked={visibleColumns.has(col.key)} onCheckedChange={() => toggleColumn(col.key)} />
                  {col.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>

          {selectedContacts.size > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteContacts}>
              <Trash2 className="h-4 w-4" />Delete ({selectedContacts.size})
            </Button>
          )}

          {duplicateCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMergeAllDuplicates} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Merge {duplicateCount} Duplicate{duplicateCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" />Advanced Filters</h3>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">Clear all</Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {contactStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Source</Label>
                <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {contactSources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tag</Label>
                <Select value={filters.tag || 'all'} onValueChange={(v) => setFilters({ ...filters, tag: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {uniqueTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City</Label>
                <Input className="h-8 text-xs" placeholder="Filter by city" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Group</Label>
                <Input className="h-8 text-xs" placeholder="Filter by group" value={filters.group} onChange={e => setFilters({ ...filters, group: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Created From</Label>
                <Input type="date" className="h-8 text-xs" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Created To</Label>
                <Input type="date" className="h-8 text-xs" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-xs text-muted-foreground">
        Showing {filteredContacts.length} of {contacts.length} contacts
        {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">{contacts.length === 0 ? 'No contacts yet' : 'No contacts found'}</h2>
          <p className="text-muted-foreground mb-6">{contacts.length === 0 ? 'Add your first contact or import from CSV' : 'Try adjusting your search or filters'}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-3 text-left w-10">
                    <Checkbox checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0} onCheckedChange={toggleSelectAll} />
                  </th>
                  {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                    <th key={col.key} className="p-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{col.label}</th>
                  ))}
                  <th className="p-3 text-right text-xs font-medium text-muted-foreground w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Checkbox checked={selectedContacts.has(contact.id)} onCheckedChange={() => toggleSelectContact(contact.id)} />
                    </td>
                    {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                      <td key={col.key} className="p-3">{renderCellValue(contact, col.key)}</td>
                    ))}
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(contact)}><Edit2 className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update contact information.</DialogDescription>
          </DialogHeader>
          <ContactForm formData={formData} setFormData={setFormData} newTag={newTag} setNewTag={setNewTag} addTag={addTag} removeTag={removeTag} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>Cancel</Button>
            <Button variant="hero" onClick={handleUpdateContact} disabled={saving || !formData.phone}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ContactFormProps {
  formData: {
    name: string; phone: string; email: string; category: string; notes: string; tags: string[];
    source: string; status: string; city: string; group: string;
  };
  setFormData: (data: any) => void;
  newTag: string;
  setNewTag: (tag: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
}

function ContactForm({ formData, setFormData, newTag, setNewTag, addTag, removeTag }: ContactFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs">Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-xs">Phone *</Label>
          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1234567890" required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category" className="text-xs">Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status" className="text-xs">Status</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {contactStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source" className="text-xs">Source</Label>
          <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {contactSources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="city" className="text-xs">City</Label>
          <Input id="city" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Mumbai" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="group" className="text-xs">Group</Label>
          <Input id="group" value={formData.group} onChange={(e) => setFormData({ ...formData, group: e.target.value })} placeholder="e.g. Premium" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tags</Label>
        <div className="flex gap-2">
          <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add tag" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
          <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} /></Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs">Notes</Label>
        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Additional notes..." rows={3} />
      </div>
    </div>
  );
}
