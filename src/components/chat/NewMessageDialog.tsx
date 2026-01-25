import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Send, FileText, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Template } from '@/lib/supabase-types';
import { z } from 'zod';

const phoneSchema = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be at most 15 digits')
  .regex(/^\+?[0-9]+$/, 'Phone number must contain only digits and optional + prefix');

const messageSchema = z.string()
  .min(1, 'Message cannot be empty')
  .max(4096, 'Message must be less than 4096 characters');

interface NewMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  whatsappNumberId: string;
  userId: string;
  templates: Template[];
  onMessageSent?: () => void;
}

export function NewMessageDialog({
  open,
  onOpenChange,
  whatsappNumberId,
  userId,
  templates,
  onMessageSent,
}: NewMessageDialogProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'template'>('text');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setPhoneNumber('');
      setMessage('');
      setSelectedTemplate(null);
      setPhoneError(null);
      setMessageError(null);
    }
  }, [open]);

  const validatePhone = (value: string) => {
    const result = phoneSchema.safeParse(value);
    if (!result.success) {
      setPhoneError(result.error.errors[0].message);
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const validateMessage = (value: string) => {
    if (activeTab === 'template') return true;
    const result = messageSchema.safeParse(value);
    if (!result.success) {
      setMessageError(result.error.errors[0].message);
      return false;
    }
    setMessageError(null);
    return true;
  };

  const handleSendTextMessage = async () => {
    if (!validatePhone(phoneNumber) || !validateMessage(message)) return;
    
    setSending(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          whatsapp_number_id: whatsappNumberId,
          to: phoneNumber.trim(),
          message_type: 'text',
          content: message.trim(),
        },
      });

      if (error) {
        toast.error('Failed to send message');
        console.error('Error sending message:', error);
      } else {
        toast.success('Message sent successfully');
        onOpenChange(false);
        onMessageSent?.();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!validatePhone(phoneNumber)) return;
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          whatsapp_number_id: whatsappNumberId,
          to: phoneNumber.trim(),
          message_type: 'template',
          template_name: selectedTemplate.name,
          template_language: selectedTemplate.language,
        },
      });

      if (error) {
        toast.error('Failed to send template');
        console.error('Error sending template:', error);
      } else {
        toast.success('Template sent successfully');
        onOpenChange(false);
        onMessageSent?.();
      }
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (activeTab === 'text') {
      handleSendTextMessage();
    } else {
      handleSendTemplate();
    }
  };

  const approvedTemplates = templates.filter(t => t.status === 'APPROVED');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            New Message
          </DialogTitle>
          <DialogDescription>
            Start a new conversation by entering a phone number and sending a message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="e.g., +1234567890"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (phoneError) validatePhone(e.target.value);
              }}
              onBlur={() => phoneNumber && validatePhone(phoneNumber)}
              className={phoneError ? 'border-destructive' : ''}
            />
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Include country code (e.g., +91 for India, +1 for US)
            </p>
          </div>

          {/* Message Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'text' | 'template')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Message</TabsTrigger>
              <TabsTrigger value="template">Template</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="flex-1 space-y-2 mt-4">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (messageError) validateMessage(e.target.value);
                }}
                onBlur={() => message && validateMessage(message)}
                className={`min-h-[120px] resize-none ${messageError ? 'border-destructive' : ''}`}
              />
              {messageError && (
                <p className="text-xs text-destructive">{messageError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {message.length}/4096 characters
              </p>
            </TabsContent>

            <TabsContent value="template" className="flex-1 overflow-hidden mt-4">
              <Label>Select Template</Label>
              <ScrollArea className="h-[200px] mt-2 border border-border rounded-lg p-2">
                {approvedTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No approved templates</p>
                    <p className="text-xs mt-1">Sync templates from Meta first</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {approvedTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => setSelectedTemplate(template)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-foreground text-sm">{template.name}</h4>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {template.language}
                          </span>
                        </div>
                        {template.components && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {Array.isArray(template.components)
                              ? (template.components as any[]).find((c: any) => c.type === 'BODY')?.text || 'No body text'
                              : 'No body text'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Send Button */}
        <div className="pt-4 border-t border-border">
          <Button
            onClick={handleSend}
            disabled={
              sending ||
              !phoneNumber.trim() ||
              (activeTab === 'text' && !message.trim()) ||
              (activeTab === 'template' && !selectedTemplate)
            }
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
