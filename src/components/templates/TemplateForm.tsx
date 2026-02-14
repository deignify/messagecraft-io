import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
import { Plus, Trash2, Loader2, Upload, X } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setButtons(template.buttons || []);
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

  const addButton = () => {
    if (buttons.length >= 3) return;
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

  // Build preview template object
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
                    // Auto-format: lowercase, replace spaces/special chars with underscore
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
                <Label>Header Type</Label>
                <Select
                  value={formData.header_type}
                  onValueChange={(value: TemplateHeaderType) =>
                    setFormData((prev) => ({ ...prev, header_type: value, header_media_url: '', header_text: '' }))
                  }
                  disabled={!isEditable}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HEADER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
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
                </div>
              )}

              {['image', 'video', 'document'].includes(formData.header_type) && (
                <div className="space-y-3">
                  <Label>Upload Media</Label>
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

            {/* Body */}
            <div className="space-y-2">
              <Label>Body Text *</Label>
              <Textarea
                value={formData.body_text}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Hello {{1}}, your order {{2}} is confirmed."
                rows={4}
                disabled={!isEditable}
              />
              <p className="text-xs text-muted-foreground">
                Use {"{{1}}"}, {"{{2}}"}, etc. for variables
              </p>
            </div>

            {/* Variables */}
            {Object.keys(formData.variables || {}).length > 0 && (
              <div className="space-y-2">
                <Label>Variable Sample Values</Label>
                <p className="text-xs text-muted-foreground">
                  These are sample values for preview only. Actual values will be set when sending campaigns.
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
                        placeholder={`Sample value for preview`}
                        disabled={!isEditable}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="space-y-2">
              <Label>Footer Text (Optional)</Label>
              <Input
                value={formData.footer_text}
                onChange={(e) => setFormData((prev) => ({ ...prev, footer_text: e.target.value }))}
                placeholder="Footer text..."
                maxLength={60}
                disabled={!isEditable}
              />
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Buttons (Optional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addButton} disabled={buttons.length >= 3 || !isEditable}>
                  <Plus className="h-4 w-4 mr-1" /> Add Button
                </Button>
              </div>

              {buttons.map((button, index) => (
                <div key={index} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Button {index + 1}</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeButton(index)} disabled={!isEditable}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select
                        value={button.type}
                        onValueChange={(value: TemplateButton['type']) => updateButton(index, { type: value })}
                        disabled={!isEditable}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="quick_reply">Quick Reply</SelectItem>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="phone_number">Phone Number</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Button Text</Label>
                      <Input
                        value={button.text}
                        onChange={(e) => updateButton(index, { text: e.target.value })}
                        placeholder="Button text"
                        maxLength={25}
                        disabled={!isEditable}
                      />
                    </div>
                  </div>
                  {button.type === 'url' && (
                    <div className="space-y-1">
                      <Label className="text-xs">URL</Label>
                      <Input
                        type="url"
                        value={button.url || ''}
                        onChange={(e) => updateButton(index, { url: e.target.value })}
                        placeholder="https://example.com"
                        disabled={!isEditable}
                      />
                    </div>
                  )}
                  {button.type === 'phone_number' && (
                    <div className="space-y-1">
                      <Label className="text-xs">Phone Number</Label>
                      <Input
                        type="tel"
                        value={button.phone_number || ''}
                        onChange={(e) => updateButton(index, { phone_number: e.target.value })}
                        placeholder="+1234567890"
                        disabled={!isEditable}
                      />
                    </div>
                  )}
                </div>
              ))}
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
