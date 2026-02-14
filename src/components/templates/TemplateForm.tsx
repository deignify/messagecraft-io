import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Trash2, Loader2, Upload, X, Globe, Phone, MessageSquareReply, Copy, Bold, Italic, Strikethrough, Code, Smile, MapPin, Image, Video, FileText, Type } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TemplatePreview } from './TemplatePreview';
import type {
  MessageTemplate,
  CreateTemplateInput,
  TemplateButton,
  TemplateVariables,
  CustomTemplateCategory,
  TemplateHeaderType,
} from '@/lib/template-types';
import {
  SUPPORTED_LANGUAGES,
  TEMPLATE_CATEGORIES,
  HEADER_TYPES,
} from '@/lib/template-types';

interface TemplateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: MessageTemplate | null;
  onSubmit: (data: CreateTemplateInput) => Promise<boolean | MessageTemplate | null>;
  saving: boolean;
}

const HEADER_ICONS: Record<string, React.ReactNode> = {
  none: null,
  text: <Type className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
};

const COMMON_EMOJIS = [
  '😀', '😊', '😂', '🤣', '😍', '🥰', '😘', '😎', '🤩', '😇',
  '👋', '👍', '👏', '🙏', '💪', '🤝', '✌️', '🎉', '🎊', '🔥',
  '❤️', '💚', '💙', '💜', '🧡', '💛', '⭐', '✨', '💯', '✅',
  '📱', '💻', '📧', '📞', '🏠', '🏢', '🚀', '💼', '📦', '🛒',
];

export function TemplateForm({
  open,
  onOpenChange,
  template,
  onSubmit,
  saving,
}: TemplateFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CreateTemplateInput>({
    template_name: '',
    category: 'utility',
    language: 'en',
    header_type: 'none',
    header_text: '',
    header_media_url: '',
    body_text: '',
    footer_text: '',
    variables: {},
    buttons: [],
  });

  const [buttons, setButtons] = useState<TemplateButton[]>([]);
  const [actionType, setActionType] = useState<'none' | 'cta' | 'quick_replies' | 'copy_code'>('none');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (template) {
      setFormData({
        template_name: template.template_name,
        category: template.category,
        language: template.language,
        header_type: template.header_type,
        header_text: template.header_text || '',
        header_media_url: template.header_media_url || '',
        body_text: template.body_text,
        footer_text: template.footer_text || '',
        variables: template.variables || {},
        buttons: template.buttons || [],
      });
      const btns = template.buttons || [];
      setButtons(btns);
      if (btns.length === 0) {
        setActionType('none');
      } else {
        const hasCta = btns.some(b => b.type === 'url' || b.type === 'phone_number');
        const hasQr = btns.some(b => b.type === 'quick_reply');
        const hasCopyCode = btns.some(b => b.type === 'copy_code');
        if (hasCopyCode) setActionType('copy_code');
        else if (hasCta) setActionType('cta');
        else if (hasQr) setActionType('quick_replies');
        else setActionType('none');
      }
    } else {
      setFormData({
        template_name: '',
        category: 'utility',
        language: 'en',
        header_type: 'none',
        header_text: '',
        header_media_url: '',
        body_text: '',
        footer_text: '',
        variables: {},
        buttons: [],
      });
      setButtons([]);
      setActionType('none');
    }
  }, [template, open]);

  const extractVariables = (text: string): TemplateVariables => {
    const regex = /\{\{(\d+)\}\}/g;
    const variables: TemplateVariables = {};
    let match;
    while ((match = regex.exec(text)) !== null) {
      const key = match[1];
      variables[key] = formData.variables?.[key] || '';
    }
    return variables;
  };

  const handleBodyChange = (value: string) => {
    const newVariables = extractVariables(value);
    setFormData((prev) => ({
      ...prev,
      body_text: value,
      variables: newVariables,
    }));
  };

  // Body formatting helpers
  const insertFormatting = (prefix: string, suffix: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.body_text;
    const selected = text.substring(start, end);
    const newText = text.substring(0, start) + prefix + (selected || 'text') + suffix + text.substring(end);
    handleBodyChange(newText);
    setTimeout(() => {
      textarea.focus();
      const newPos = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length;
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
    }, 0);
  };

  const insertVariable = () => {
    const existingVars = Object.keys(formData.variables || {});
    const nextNum = existingVars.length > 0 ? Math.max(...existingVars.map(Number)) + 1 : 1;
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const text = formData.body_text;
    const newText = text.substring(0, pos) + `{{${nextNum}}}` + text.substring(pos);
    handleBodyChange(newText);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const text = formData.body_text;
    const newText = text.substring(0, pos) + emoji + text.substring(pos);
    handleBodyChange(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(pos + emoji.length, pos + emoji.length);
    }, 0);
  };

  const handleActionTypeChange = (value: 'none' | 'cta' | 'quick_replies' | 'copy_code') => {
    setActionType(value);
    if (value === 'none') {
      setButtons([]);
    } else if (value === 'copy_code') {
      setButtons([{ type: 'copy_code', text: 'Copy offer code', example: '' }]);
    }
  };

  const addCtaButton = (type: 'url' | 'phone_number') => {
    const ctaCount = buttons.filter(b => b.type === 'url' || b.type === 'phone_number').length;
    if (ctaCount >= 2) return;
    setButtons([...buttons, { type, text: '' }]);
  };

  const addQuickReply = () => {
    const qrCount = buttons.filter(b => b.type === 'quick_reply').length;
    if (qrCount >= 3) return;
    setButtons([...buttons, { type: 'quick_reply', text: '' }]);
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    setButtons((prev) =>
      prev.map((btn, i) => (i === index ? { ...btn, ...updates } : btn))
    );
  };

  const removeButton = (index: number) => {
    setButtons((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('template-media')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('template-media')
        .getPublicUrl(path);

      setFormData((prev) => ({ ...prev, header_media_url: urlData.publicUrl }));
    } catch (error: any) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = () => {
    setFormData((prev) => ({ ...prev, header_media_url: '' }));
  };

  const handleFormSubmit = async () => {
    const result = await onSubmit({ ...formData, buttons });
    if (result) onOpenChange(false);
  };

  const isEditable = !template || template.status === 'draft' || template.status === 'rejected';

  const previewTemplate: Partial<MessageTemplate> = {
    ...formData,
    buttons,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Column */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template_name">Template Name *</Label>
                <Input
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => {
                    const formatted = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9_]/g, '_')
                      .replace(/_+/g, '_');
                    setFormData((prev) => ({ ...prev, template_name: formatted }));
                  }}
                  placeholder="e.g., welcome_message"
                  pattern="[a-z0-9_]+"
                  disabled={!isEditable}
                />
                <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and underscores</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: CustomTemplateCategory) =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                  disabled={!isEditable}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Language *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}
                disabled={!isEditable}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Header */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Header</Label>
                <p className="text-xs text-muted-foreground">Add a title or choose which type of media you'll use for this header.</p>
                <Select
                  value={formData.header_type}
                  onValueChange={(value: TemplateHeaderType) =>
                    setFormData((prev) => ({ ...prev, header_type: value, header_media_url: '', header_text: '' }))
                  }
                  disabled={!isEditable}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      {HEADER_ICONS[formData.header_type]}
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {HEADER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {HEADER_ICONS[type.value]}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.header_type === 'text' && (
                <div className="space-y-2">
                  <Label>Header Text</Label>
                  <Input
                    value={formData.header_text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, header_text: e.target.value }))}
                    placeholder="Header text..."
                    maxLength={60}
                    disabled={!isEditable}
                  />
                  <p className="text-xs text-muted-foreground">{formData.header_text?.length || 0}/60 characters</p>
                </div>
              )}

              {formData.header_type === 'location' && (
                <div className="p-3 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>Location header will be sent as a location pin. The recipient's device will render the map.</span>
                  </div>
                </div>
              )}

              {['image', 'video', 'document'].includes(formData.header_type) && (
                <div className="space-y-3">
                  <Label>Media Sample · Optional</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={
                      formData.header_type === 'image' ? 'image/*' :
                      formData.header_type === 'video' ? 'video/*' :
                      '.pdf,.doc,.docx'
                    }
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {formData.header_media_url ? (
                    <div className="relative border border-border rounded-lg overflow-hidden">
                      {formData.header_type === 'image' && (
                        <img src={formData.header_media_url} alt="Header" className="w-full max-h-40 object-cover" />
                      )}
                      {formData.header_type !== 'image' && (
                        <div className="p-4 text-sm text-muted-foreground truncate">
                          {formData.header_media_url.split('/').pop()}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon-sm"
                        className="absolute top-2 right-2"
                        onClick={removeMedia}
                        disabled={!isEditable}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !isEditable}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      {uploading ? 'Uploading...' : `Upload ${formData.header_type}`}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Body with formatting toolbar */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Body *</Label>
              <p className="text-xs text-muted-foreground">Enter the text for your message in the language you've selected.</p>
              
              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 p-1.5 border border-border rounded-t-md bg-muted/30 flex-wrap">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => insertFormatting('*', '*')}
                  title="Bold"
                  disabled={!isEditable}
                >
                  <Bold className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => insertFormatting('_', '_')}
                  title="Italic"
                  disabled={!isEditable}
                >
                  <Italic className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => insertFormatting('~', '~')}
                  title="Strikethrough"
                  disabled={!isEditable}
                >
                  <Strikethrough className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => insertFormatting('```', '```')}
                  title="Monospace"
                  disabled={!isEditable}
                >
                  <Code className="h-3.5 w-3.5" />
                </Button>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Emoji Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Insert Emoji"
                      disabled={!isEditable}
                    >
                      <Smile className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2" align="start">
                    <div className="grid grid-cols-8 gap-1">
                      {COMMON_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="h-7 w-7 flex items-center justify-center hover:bg-muted rounded text-base cursor-pointer"
                          onClick={() => insertEmoji(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="w-px h-5 bg-border mx-1" />

                {/* Add Variable */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={insertVariable}
                  title="Add Variable"
                  disabled={!isEditable}
                >
                  <Plus className="h-3 w-3" />
                  Variable
                </Button>
              </div>

              <Textarea
                ref={bodyTextareaRef}
                value={formData.body_text}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Hello {{1}}, your order {{2}} is confirmed."
                rows={4}
                disabled={!isEditable}
                className="rounded-t-none border-t-0"
              />
              <p className="text-xs text-muted-foreground">
                Use *bold*, _italic_, ~strikethrough~, ```monospace``` · Variables: {"{{1}}"}, {"{{2}}"}
              </p>
            </div>

            {/* Variables */}
            {Object.keys(formData.variables || {}).length > 0 && (
              <div className="space-y-2">
                <Label>Variable Example Values (Required for Meta Approval)</Label>
                <p className="text-xs text-destructive font-medium">
                  ⚠️ Meta requires example values for all variables. Templates without examples will be rejected.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(formData.variables || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground min-w-12">{`{{${key}}}`}</span>
                      <Input
                        value={value}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            variables: { ...prev.variables, [key]: e.target.value },
                          }))
                        }
                        placeholder={`Sample value for {{${key}}}`}
                        disabled={!isEditable}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Footer</Label>
              <p className="text-xs text-muted-foreground">Add a short line of text to the bottom of your message template.</p>
              <Input
                value={formData.footer_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, footer_text: e.target.value }))}
                placeholder="Footer text..."
                maxLength={60}
                disabled={!isEditable}
              />
              <p className="text-xs text-muted-foreground">{formData.footer_text?.length || 0}/60 characters</p>
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Buttons</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Create buttons that let customers respond to your message or take action.
                </p>
              </div>

              <RadioGroup
                value={actionType}
                onValueChange={(v) => handleActionTypeChange(v as any)}
                className="grid grid-cols-2 gap-3"
                disabled={!isEditable}
              >
                {[
                  { value: 'none', label: 'None', desc: 'No buttons' },
                  { value: 'cta', label: 'Call to Action', desc: 'Website URL or Phone' },
                  { value: 'quick_replies', label: 'Quick Reply', desc: 'Up to 3 replies' },
                  { value: 'copy_code', label: 'Copy Code', desc: 'Offer/OTP code' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    htmlFor={`action-${opt.value}`}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      actionType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <RadioGroupItem value={opt.value} id={`action-${opt.value}`} className="mt-0.5" />
                    <div>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {/* CTA Buttons */}
              {actionType === 'cta' && (
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Call to Action Buttons <span className="text-xs text-muted-foreground font-normal">(max 2)</span></Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCtaButton('url')}
                        disabled={buttons.filter(b => b.type === 'url' || b.type === 'phone_number').length >= 2 || !isEditable}
                      >
                        <Globe className="h-3 w-3 mr-1" /> Visit Website
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCtaButton('phone_number')}
                        disabled={buttons.filter(b => b.type === 'url' || b.type === 'phone_number').length >= 2 || !isEditable}
                      >
                        <Phone className="h-3 w-3 mr-1" /> Call Phone
                      </Button>
                    </div>
                  </div>

                  {buttons.filter(b => b.type === 'url' || b.type === 'phone_number').map((button) => {
                    const originalIndex = buttons.indexOf(button);
                    return (
                      <div key={originalIndex} className="p-3 border border-border rounded-md bg-background space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            {button.type === 'url' ? <Globe className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                            {button.type === 'url' ? 'Visit Website' : 'Call Phone Number'}
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeButton(originalIndex)} disabled={!isEditable}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Button Text</Label>
                            <Input
                              value={button.text}
                              onChange={(e) => updateButton(originalIndex, { text: e.target.value })}
                              placeholder={button.type === 'url' ? 'Visit Website' : 'Call Us'}
                              maxLength={25}
                              disabled={!isEditable}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{button.type === 'url' ? 'URL' : 'Phone Number'}</Label>
                            <Input
                              type={button.type === 'url' ? 'url' : 'tel'}
                              value={button.type === 'url' ? (button.url || '') : (button.phone_number || '')}
                              onChange={(e) => updateButton(originalIndex, button.type === 'url' ? { url: e.target.value } : { phone_number: e.target.value })}
                              placeholder={button.type === 'url' ? 'https://example.com' : '+1234567890'}
                              disabled={!isEditable}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Reply Buttons */}
              {actionType === 'quick_replies' && (
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MessageSquareReply className="h-4 w-4 text-primary" />
                      Quick Replies
                      <span className="text-xs text-muted-foreground font-normal">(max 3)</span>
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addQuickReply}
                      disabled={buttons.filter(b => b.type === 'quick_reply').length >= 3 || !isEditable}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Reply
                    </Button>
                  </div>

                  {buttons.filter(b => b.type === 'quick_reply').map((button) => {
                    const originalIndex = buttons.indexOf(button);
                    return (
                      <div key={originalIndex} className="flex items-center gap-2">
                        <MessageSquareReply className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          value={button.text}
                          onChange={(e) => updateButton(originalIndex, { text: e.target.value })}
                          placeholder="Quick reply text"
                          maxLength={25}
                          disabled={!isEditable}
                          className="flex-1"
                        />
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeButton(originalIndex)} disabled={!isEditable}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Copy Code Button */}
              {actionType === 'copy_code' && (
                <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Copy className="h-4 w-4 text-primary" />
                    Copy Offer Code
                  </Label>
                  <p className="text-xs text-muted-foreground">Add a copy code button to let customers copy a coupon/offer code.</p>
                  {buttons.filter(b => b.type === 'copy_code').map((button) => {
                    const originalIndex = buttons.indexOf(button);
                    return (
                      <div key={originalIndex} className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Button Text</Label>
                          <Input
                            value={button.text}
                            onChange={(e) => updateButton(originalIndex, { text: e.target.value })}
                            placeholder="Copy offer code"
                            maxLength={25}
                            disabled={!isEditable}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Example Code</Label>
                          <Input
                            value={button.example || ''}
                            onChange={(e) => updateButton(originalIndex, { example: e.target.value })}
                            placeholder="e.g., SAVE20"
                            disabled={!isEditable}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="hidden lg:block sticky top-0">
            <Label className="text-sm text-muted-foreground mb-3 block">Live Preview</Label>
            <TemplatePreview template={previewTemplate} />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="hero"
            disabled={saving || !isEditable || !formData.template_name || !formData.body_text}
            onClick={handleFormSubmit}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? 'Update Template' : 'Submit for Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
