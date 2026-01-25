import { useState, useEffect } from 'react';
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
import { Plus, Trash2, Loader2 } from 'lucide-react';
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

  // Extract variables from body text
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

  const handleFormSubmit = async () => {
    const result = await onSubmit({
      ...formData,
      buttons,
    });

    if (result) {
      onOpenChange(false);
    }
  };

  const isEditable = !template || template.status === 'draft' || template.status === 'rejected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Edit Template' : 'Create New Template'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template_name">Template Name *</Label>
              <Input
                id="template_name"
                value={formData.template_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, template_name: e.target.value }))
                }
                placeholder="e.g., welcome_message"
                pattern="[a-z0-9_]+"
                title="Only lowercase letters, numbers, and underscores"
                required
                disabled={!isEditable}
              />
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language *</Label>
            <Select
              value={formData.language}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, language: value }))
              }
              disabled={!isEditable}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
                  setFormData((prev) => ({ ...prev, header_type: value }))
                }
                disabled={!isEditable}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HEADER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.header_type === 'text' && (
              <div className="space-y-2">
                <Label htmlFor="header_text">Header Text</Label>
                <Input
                  id="header_text"
                  value={formData.header_text}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, header_text: e.target.value }))
                  }
                  placeholder="Header text..."
                  maxLength={60}
                  disabled={!isEditable}
                />
              </div>
            )}

            {['image', 'video', 'document'].includes(formData.header_type) && (
              <div className="space-y-2">
                <Label htmlFor="header_media_url">Media URL</Label>
                <Input
                  id="header_media_url"
                  type="url"
                  value={formData.header_media_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, header_media_url: e.target.value }))
                  }
                  placeholder="https://example.com/image.jpg"
                  disabled={!isEditable}
                />
              </div>
            )}
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body_text">Body Text *</Label>
            <Textarea
              id="body_text"
              value={formData.body_text}
              onChange={(e) => handleBodyChange(e.target.value)}
              placeholder="Hello {{1}}, your order {{2}} is confirmed."
              rows={4}
              required
              disabled={!isEditable}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{1}}"}, {"{{2}}"}, etc. for variables
            </p>
          </div>

          {/* Variables Preview */}
          {Object.keys(formData.variables || {}).length > 0 && (
            <div className="space-y-2">
              <Label>Variables</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(formData.variables || {}).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground min-w-12">
                      {`{{${key}}}`}
                    </span>
                    <Input
                      value={value}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          variables: { ...prev.variables, [key]: e.target.value },
                        }))
                      }
                      placeholder={`Variable ${key} description`}
                      disabled={!isEditable}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text (Optional)</Label>
            <Input
              id="footer_text"
              value={formData.footer_text}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, footer_text: e.target.value }))
              }
              placeholder="Footer text..."
              maxLength={60}
              disabled={!isEditable}
            />
          </div>

          {/* Buttons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Buttons (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addButton}
                disabled={buttons.length >= 3 || !isEditable}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Button
              </Button>
            </div>

            {buttons.map((button, index) => (
              <div
                key={index}
                className="p-4 border border-border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Label>Button {index + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeButton(index)}
                    disabled={!isEditable}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={button.type}
                      onValueChange={(value: TemplateButton['type']) =>
                        updateButton(index, { type: value })
                      }
                      disabled={!isEditable}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                      onChange={(e) =>
                        updateButton(index, { phone_number: e.target.value })
                      }
                      placeholder="+1234567890"
                      disabled={!isEditable}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
