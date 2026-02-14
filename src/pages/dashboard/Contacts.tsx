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
  MoreVertical,
  Loader2,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact } from '@/lib/supabase-types';
import { useToast } from '@/hooks/use-toast';

const categories = ['Customer', 'Lead', 'VIP', 'Supplier', 'Partner', 'Other'];

export default function Contacts() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const { toast } = useToast();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: '',
    notes: '',
    tags: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [newTag, setNewTag] = useState('');

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
        setContacts(data as Contact[]);
      }
      setLoading(false);
    };

    fetchContacts();
  }, [selectedNumber, user]);

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      category: '',
      notes: '',
      tags: [],
    });
    setNewTag('');
  };

  const handleAddContact = async () => {
    if (!selectedNumber || !user || !formData.phone) return;

    // Normalize the phone number
    const normalizedPhone = formatPhoneE164(formData.phone);

    // Check for existing duplicate
    const existing = contacts.find((c) => isSamePhone(c.phone, normalizedPhone));
    if (existing) {
      // Auto-merge: update existing contact with new data
      setSaving(true);
      try {
        const mergedData = {
          name: formData.name || existing.name,
          email: formData.email || existing.email,
          category: formData.category || existing.category,
          notes: [existing.notes, formData.notes].filter(Boolean).join('\n') || null,
          tags: [...new Set([...(existing.tags || []), ...formData.tags])],
        };

        const { error } = await supabase
          .from('contacts')
          .update(mergedData)
          .eq('id', existing.id);

        if (error) throw error;

        setContacts(contacts.map((c) =>
          c.id === existing.id ? { ...c, ...mergedData } as Contact : c
        ));
        setAddDialogOpen(false);
        resetForm();
        toast({ title: 'Contact merged with existing record' });
      } catch (error: any) {
        toast({ title: 'Error merging contact', description: error.message, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('contacts').insert({
        user_id: user.id,
        whatsapp_number_id: selectedNumber.id,
        name: formData.name || null,
        phone: normalizedPhone,
        email: formData.email || null,
        category: formData.category || null,
        notes: formData.notes || null,
        tags: formData.tags,
      }).select().single();

      if (error) throw error;

      setContacts([...contacts, data as Contact]);
      setAddDialogOpen(false);
      resetForm();
      toast({ title: 'Contact added successfully' });
    } catch (error: any) {
      toast({
        title: 'Error adding contact',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: formData.name || null,
          phone: formData.phone,
          email: formData.email || null,
          category: formData.category || null,
          notes: formData.notes || null,
          tags: formData.tags,
        })
        .eq('id', editingContact.id);

      if (error) throw error;

      setContacts(contacts.map((c) =>
        c.id === editingContact.id ? { ...c, ...formData } : c
      ));
      setEditingContact(null);
      resetForm();
      toast({ title: 'Contact updated successfully' });
    } catch (error: any) {
      toast({
        title: 'Error updating contact',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContacts = async () => {
    if (selectedContacts.size === 0) return;

    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContacts));

      if (error) throw error;

      setContacts(contacts.filter((c) => !selectedContacts.has(c.id)));
      setSelectedContacts(new Set());
      toast({ title: `${selectedContacts.size} contact(s) deleted` });
    } catch (error: any) {
      toast({
        title: 'Error deleting contacts',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleSelectContact = (id: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContacts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((c) => c.id)));
    }
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

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || '',
      phone: contact.phone,
      email: contact.email || '',
      category: contact.category || '',
      notes: contact.notes || '',
      tags: contact.tags || [],
    });
  };

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Detect duplicates
  const duplicateGroups = useMemo(() => findDuplicates(contacts), [contacts]);
  const duplicateCount = duplicateGroups.size;

  const handleMergeAllDuplicates = async () => {
    if (duplicateCount === 0) return;
    setSaving(true);
    try {
      for (const [, group] of duplicateGroups) {
        // Keep the first (oldest) contact, merge others into it
        const [primary, ...others] = group.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        const mergedName = primary.name || others.find((o) => o.name)?.name || null;
        const mergedEmail = primary.email || others.find((o) => o.email)?.email || null;
        const mergedCategory = primary.category || others.find((o) => o.category)?.category || null;
        const mergedNotes = [primary.notes, ...others.map((o) => o.notes)].filter(Boolean).join('\n') || null;
        const mergedTags = [...new Set([...(primary.tags || []), ...others.flatMap((o) => o.tags || [])])];

        await supabase
          .from('contacts')
          .update({ name: mergedName, email: mergedEmail, category: mergedCategory, notes: mergedNotes, tags: mergedTags })
          .eq('id', primary.id);

        const otherIds = others.map((o) => o.id);
        await supabase.from('contacts').delete().in('id', otherIds);
      }

      // Re-fetch contacts
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber!.id)
        .order('name', { ascending: true });

      if (data) setContacts(data as Contact[]);
      toast({ title: `Merged ${duplicateCount} duplicate groups` });
    } catch (error: any) {
      toast({ title: 'Error merging', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!selectedNumber) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No WhatsApp number selected
          </h2>
          <p className="text-muted-foreground">
            Please select or connect a WhatsApp number to manage contacts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-foreground">
            Contacts
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Manage your WhatsApp contacts and organize them by categories
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" onClick={() => resetForm()}>
                <Plus className="h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to your WhatsApp number.
                </DialogDescription>
              </DialogHeader>
              
              <ContactForm
                formData={formData}
                setFormData={setFormData}
                newTag={newTag}
                setNewTag={setNewTag}
                addTag={addTag}
                removeTag={removeTag}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="hero" onClick={handleAddContact} disabled={saving || !formData.phone}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Contact'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedContacts.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleDeleteContacts}>
            <Trash2 className="h-4 w-4" />
            Delete ({selectedContacts.size})
          </Button>
        )}

        {duplicateCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMergeAllDuplicates} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Merge {duplicateCount} Duplicate{duplicateCount > 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Contacts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {contacts.length === 0 ? 'No contacts yet' : 'No contacts found'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {contacts.length === 0
              ? 'Add your first contact or import from CSV'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={selectedContacts.size === filteredContacts.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Phone</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden md:table-cell">Email</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Category</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Tags</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => toggleSelectContact(contact.id)}
                      />
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-foreground">
                        {contact.name || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">{contact.phone}</td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">{contact.email || '—'}</td>
                    <td className="p-4 hidden lg:table-cell">
                      {contact.category && (
                        <Badge variant="secondary">{contact.category}</Badge>
                      )}
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {contact.tags && contact.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{contact.tags.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(contact)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information.
            </DialogDescription>
          </DialogHeader>
          
          <ContactForm
            formData={formData}
            setFormData={setFormData}
            newTag={newTag}
            setNewTag={setNewTag}
            addTag={addTag}
            removeTag={removeTag}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancel
            </Button>
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
    name: string;
    phone: string;
    email: string;
    category: string;
    notes: string;
    tags: string[];
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1234567890"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes..."
          rows={3}
        />
      </div>
    </div>
  );
}
