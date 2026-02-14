import { useState, useEffect, useRef } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  MessageCircle,
  Search,
  Send,
  Phone,
  MoreVertical,
  Loader2,
  Paperclip,
  X,
  ArrowLeft,
  AlertTriangle,
  Plus,
  FileText,
  Filter,
} from 'lucide-react';
import { NewMessageDialog } from '@/components/chat/NewMessageDialog';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { EmojiPicker } from '@/components/chat/EmojiPicker';
import { QuickRepliesPopover } from '@/components/chat/QuickRepliesPopover';
import { ChatLabels } from '@/components/chat/ChatLabels';
import { ContactSidebar } from '@/components/chat/ContactSidebar';
import { cn } from '@/lib/utils';
import type { Conversation, Message, Template } from '@/lib/supabase-types';
import type { MessageTemplate, TemplateButton, TemplateVariables } from '@/lib/template-types';
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type StatusFilter = 'all' | 'open' | 'closed' | 'pending';

export default function LiveChat() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 24-hour window state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customTemplates, setCustomTemplates] = useState<MessageTemplate[]>([]);
  
  // New message dialog state
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [isOutsideWindow, setIsOutsideWindow] = useState(false);

  // Fetch conversations
  useEffect(() => {
    if (!selectedNumber || !user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        setConversations(data as Conversation[]);
      }
      setLoading(false);
    };

    fetchConversations();

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `whatsapp_number_id=eq.${selectedNumber.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setConversations((prev) => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Conversation;
            setConversations((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c))
            );
            // Also update selected conversation if it's the one being updated
            setSelectedConversation((prev) =>
              prev?.id === updated.id ? updated : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedNumber, user]);

  // Fetch templates
  useEffect(() => {
    if (!selectedNumber || !user) return;

    const fetchTemplates = async () => {
      const { data } = await supabase
        .from('templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .eq('status', 'APPROVED')
        .order('name', { ascending: true });

      if (data) setTemplates(data as Template[]);

      const { data: customData } = await supabase
        .from('message_templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (customData) {
        setCustomTemplates(customData.map((item: any) => ({
          ...item,
          variables: (item.variables as TemplateVariables) || {},
          buttons: (item.buttons as TemplateButton[]) || [],
        })));
      }
    };

    fetchTemplates();
  }, [selectedNumber, user]);

  // Check 24-hour window
  useEffect(() => {
    if (!selectedConversation || !messages.length) {
      setIsOutsideWindow(false);
      return;
    }
    const lastInbound = [...messages].reverse().find(m => m.direction === 'inbound');
    if (!lastInbound) {
      setIsOutsideWindow(true);
      return;
    }
    setIsOutsideWindow(differenceInHours(new Date(), new Date(lastInbound.created_at)) >= 24);
  }, [selectedConversation, messages]);

  // Fetch messages & subscribe + reset unread count
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (data) setMessages(data as Message[]);
    };

    // Reset unread count when opening conversation
    const resetUnread = async () => {
      if (selectedConversation.unread_count > 0) {
        await supabase
          .from('conversations')
          .update({ unread_count: 0 })
          .eq('id', selectedConversation.id);
        // Update local state
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c))
        );
        setSelectedConversation((prev) =>
          prev ? { ...prev, unread_count: 0 } : prev
        );
      }
    };

    fetchMessages();
    resetUnread();

    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => [...prev, payload.new as Message]);
            // Simulate typing indicator for inbound messages
            if ((payload.new as Message).direction === 'inbound') {
              setIsTyping(false);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            }
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as Message) : m))
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 16MB.');
      return;
    }
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4', 'video/3gpp',
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type.');
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `chat-media/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    const { data: { publicUrl } } = supabase.storage.from('room-photos').getPublicUrl(fileName);
    return publicUrl;
  };

  const getMessageTypeFromFile = (file: File): 'image' | 'document' | 'video' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  // Quick reply shortcut detection
  const handleInputChange = (value: string) => {
    setNewMessage(value);
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !selectedNumber || !user) return;

    if (isOutsideWindow && !selectedFile) {
      if (templates.length === 0) {
        toast.error('No approved templates available. Sync templates first.');
        return;
      }
      setShowTemplateDialog(true);
      return;
    }

    setSending(true);
    setUploadingMedia(!!selectedFile);

    try {
      let mediaUrl: string | undefined;
      let messageType: 'text' | 'image' | 'document' | 'video' = 'text';
      let mediaFilename: string | undefined;

      if (selectedFile) {
        mediaUrl = await uploadFileToStorage(selectedFile);
        messageType = getMessageTypeFromFile(selectedFile);
        mediaFilename = selectedFile.name;
      }

      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          whatsapp_number_id: selectedNumber.id,
          to: selectedConversation.contact_phone,
          message_type: messageType,
          content: newMessage.trim() || undefined,
          media_url: mediaUrl,
          media_caption: messageType !== 'text' && newMessage.trim() ? newMessage.trim() : undefined,
          media_filename: mediaFilename,
        },
      });

      const payload: any = data;
      const errorMessage = error?.message || payload?.error;

      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        setNewMessage('');
        clearSelectedFile();
        // Show typing indicator until bot/server reply arrives (max 10s)
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 10000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setUploadingMedia(false);
    }
  };

  const handleSendTemplate = async (template: Template) => {
    if (!selectedConversation || !selectedNumber || !user) return;
    setSending(true);
    setShowTemplateDialog(false);

    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          whatsapp_number_id: selectedNumber.id,
          to: selectedConversation.contact_phone,
          message_type: 'template',
          template_name: template.name,
          template_language: template.language,
        },
      });

      const payload: any = data;
      const errorMessage = error?.message || payload?.error;
      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
      toast.success('Template submitted (delivery pending)');
      setNewMessage('');
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleQuickReplySelect = (message: string) => {
    setNewMessage(message);
    inputRef.current?.focus();
  };

  const handleLabelsChange = (labels: string[]) => {
    if (!selectedConversation) return;
    setSelectedConversation({ ...selectedConversation, labels } as any);
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConversation.id ? { ...c, labels } as any : c))
    );
  };

  const formatConversationTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch =
      c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contact_phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: conversations.length,
    open: conversations.filter((c) => c.status === 'open').length,
    closed: conversations.filter((c) => c.status === 'closed').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
  };

  if (!selectedNumber) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No WhatsApp number selected</h2>
          <p className="text-muted-foreground">Please select or connect a WhatsApp number to view conversations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card",
        selectedConversation ? "hidden md:flex" : "flex"
      )}>
        {/* Search & New */}
        <div className="p-3 md:p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => setShowNewMessageDialog(true)}
              size="icon"
              className="h-10 w-10 flex-shrink-0"
              title="New Message"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          {/* Status Filters */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {(['all', 'open', 'pending', 'closed'] as StatusFilter[]).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs capitalize flex-shrink-0"
                onClick={() => setStatusFilter(status)}
              >
                {status}
                <span className={cn(
                  "ml-1 text-[10px] px-1.5 rounded-full",
                  statusFilter === status ? "bg-primary-foreground/20" : "bg-muted"
                )}>
                  {statusCounts[status]}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conversation) => {
                const convLabels = (conversation as any).labels || [];
                return (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={cn(
                      "flex items-center gap-3 p-3 md:p-4 cursor-pointer transition-colors hover:bg-muted/50 active:bg-muted",
                      selectedConversation?.id === conversation.id && "bg-muted"
                    )}
                  >
                    <Avatar className="h-11 w-11 md:h-12 md:w-12 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conversation.contact_name?.[0] || conversation.contact_phone[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-foreground truncate text-sm md:text-base">
                          {conversation.contact_name || conversation.contact_phone}
                        </h4>
                        <span className="text-[10px] md:text-xs text-muted-foreground flex-shrink-0">
                          {formatConversationTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5 gap-2">
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {conversation.last_message_text || 'No messages'}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full flex-shrink-0">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      {convLabels.length > 0 && (
                        <div className="mt-1">
                          <ChatLabels
                            conversationId={conversation.id}
                            labels={convLabels}
                            onLabelsChange={(labels) => {
                              setConversations((prev) =>
                                prev.map((c) => (c.id === conversation.id ? { ...c, labels } as any : c))
                              );
                            }}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col",
        selectedConversation ? "flex" : "hidden md:flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-[56px] md:h-16 px-1 md:px-4 flex items-center justify-between border-b border-border bg-card">
              <div className="flex items-center gap-1.5 md:gap-3 flex-1 min-w-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0 h-9 w-9"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10 md:h-10 md:w-10 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {(selectedConversation.contact_name || selectedConversation.contact_phone).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground text-[15px] md:text-base truncate leading-tight">
                    {selectedConversation.contact_name || selectedConversation.contact_phone}
                  </h3>
                  <p className="text-[12px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {selectedConversation.contact_name 
                      ? selectedConversation.contact_phone 
                      : 'WhatsApp Contact'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setShowTemplateDialog(true)}
                  title="Send Template"
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
                      <FileText className="h-4 w-4 mr-2" />
                      Send Template
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-muted-foreground">
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedConversation.contact_phone}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-2 md:p-4">
              <div className="space-y-2 md:space-y-3">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-2 md:p-4 border-t border-border bg-card space-y-2 md:space-y-3">
              {/* 24-hour window warning */}
              {isOutsideWindow && (
                <div className="flex items-center gap-2 p-2 md:p-3 bg-status-pending/10 border border-status-pending/20 rounded-lg text-status-pending">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-xs md:text-sm">
                    24-hour window expired. Use a template to re-engage.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="ml-auto flex-shrink-0 h-7 text-xs"
                    onClick={() => setShowTemplateDialog(true)}
                    disabled={templates.length === 0}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Send Template
                  </Button>
                </div>
              )}

              {/* File Preview */}
              {selectedFile && (
                <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-muted rounded-lg">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="h-12 w-12 md:h-16 md:w-16 object-cover rounded" />
                  ) : (
                    <div className="h-12 w-12 md:h-16 md:w-16 flex items-center justify-center bg-primary/10 rounded flex-shrink-0">
                      <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={clearSelectedFile} disabled={sending}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-1 md:gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,video/mp4,video/3gpp"
                  className="hidden"
                />

                {/* Emoji Picker */}
                <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={sending} />

                {/* Quick Replies */}
                <QuickRepliesPopover onSelect={handleQuickReplySelect} disabled={sending} />

                {/* Attachment */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Attach file"
                >
                  <Paperclip className="h-5 w-5" />
                </Button>

                <Input
                  ref={inputRef}
                  placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 h-10 md:h-11 text-sm md:text-base"
                  disabled={sending}
                />
                <Button
                  variant="hero"
                  type="submit"
                  size="icon"
                  className="h-10 w-10 md:h-11 md:w-11 flex-shrink-0"
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">Select a conversation</h3>
              <p className="text-sm text-muted-foreground">Choose a conversation from the list to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Details Sidebar */}
      {selectedConversation && (
        <div className="hidden xl:block w-80 border-l border-border bg-card">
          <ContactSidebar
            conversation={selectedConversation}
            onLabelsChange={handleLabelsChange}
          />
        </div>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              The 24-hour messaging window has expired. Choose an approved template to re-engage.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 py-2">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No approved templates available</p>
                  <p className="text-xs mt-1">Sync templates from Meta first</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-colors"
                    onClick={() => handleSendTemplate(template)}
                  >
                    <div className="flex items-center justify-between mb-2">
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
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* New Message Dialog */}
      {user && (
        <NewMessageDialog
          open={showNewMessageDialog}
          onOpenChange={setShowNewMessageDialog}
          whatsappNumberId={selectedNumber.id}
          userId={user.id}
          templates={templates}
          customTemplates={customTemplates}
          onMessageSent={() => {}}
        />
      )}
    </div>
  );
}
