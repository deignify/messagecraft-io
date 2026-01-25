// Custom template types
export type CustomTemplateCategory = 'marketing' | 'utility' | 'authentication';
export type CustomTemplateStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type TemplateHeaderType = 'none' | 'text' | 'image' | 'video' | 'document';

export interface TemplateButton {
  type: 'quick_reply' | 'url' | 'phone_number';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface TemplateVariables {
  [key: string]: string;
}

export interface MessageTemplate {
  id: string;
  user_id: string;
  whatsapp_number_id: string;
  template_name: string;
  category: CustomTemplateCategory;
  language: string;
  status: CustomTemplateStatus;
  header_type: TemplateHeaderType;
  header_text: string | null;
  header_media_url: string | null;
  body_text: string;
  footer_text: string | null;
  variables: TemplateVariables;
  buttons: TemplateButton[];
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  template_name: string;
  category: CustomTemplateCategory;
  language: string;
  header_type: TemplateHeaderType;
  header_text?: string;
  header_media_url?: string;
  body_text: string;
  footer_text?: string;
  variables?: TemplateVariables;
  buttons?: TemplateButton[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  status?: CustomTemplateStatus;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
];

export const TEMPLATE_CATEGORIES: { value: CustomTemplateCategory; label: string }[] = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'utility', label: 'Utility' },
  { value: 'authentication', label: 'Authentication' },
];

export const HEADER_TYPES: { value: TemplateHeaderType; label: string }[] = [
  { value: 'none', label: 'No Header' },
  { value: 'text', label: 'Text' },
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'document', label: 'Document' },
];
