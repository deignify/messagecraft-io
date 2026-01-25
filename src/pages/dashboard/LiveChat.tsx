import { useState, useEffect, useRef } from 'react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  MessageCircle,
  Search,
  Send,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  User,
  Loader2,
  Image as ImageIcon,
  FileText,
  MapPin,
  Video,
  Mic,
  Paperclip,
  X,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation, Message, Template } from '@/lib/supabase-types';
import { format, isToday, isYesterday, differenceInHours } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function LiveChat() {
  const { user } = useAuth();
  const { selectedNumber } = useWhatsApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 24-hour window state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
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

    // Subscribe to realtime updates
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
            setConversations((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as Conversation) : c))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedNumber, user]);

  // Fetch templates for 24-hour window fallback
  useEffect(() => {
    if (!selectedNumber || !user) return;

    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('whatsapp_number_id', selectedNumber.id)
        .eq('status', 'APPROVED')
        .order('name', { ascending: true });

      if (!error && data) {
        setTemplates(data as Template[]);
      }
    };

    fetchTemplates();
  }, [selectedNumber, user]);

  // Check 24-hour window when conversation or messages change
  useEffect(() => {
    if (!selectedConversation || !messages.length) {
      setIsOutsideWindow(false);
      return;
    }

    // Find the last inbound message
    const lastInboundMessage = [...messages]
      .reverse()
      .find(m => m.direction === 'inbound');

    if (!lastInboundMessage) {
      // No inbound messages, outside window
      setIsOutsideWindow(true);
      return;
    }

    const hoursSinceLastInbound = differenceInHours(
      new Date(),
      new Date(lastInboundMessage.created_at)
    );

    setIsOutsideWindow(hoursSinceLastInbound >= 24);
  }, [selectedConversation, messages]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConversation.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as Message[]);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 16MB for WhatsApp)
    if (file.size > 16 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 16MB.');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'video/mp4', 'video/3gpp',
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Unsupported file type. Please use images, PDFs, or documents.');
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  // Clear selected file
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload file to Supabase Storage and return public URL
  const uploadFileToStorage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `chat-media/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('room-photos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('room-photos')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // Determine message type from file
  const getMessageTypeFromFile = (file: File): 'image' | 'document' | 'video' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || !selectedNumber || !user) return;

    // Check 24-hour window - if outside, show template dialog
    if (isOutsideWindow && !selectedFile) {
      if (templates.length === 0) {
        toast.error('No approved templates available. Sync templates first to message outside the 24-hour window.');
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

      // Upload file if selected
      if (selectedFile) {
        mediaUrl = await uploadFileToStorage(selectedFile);
        messageType = getMessageTypeFromFile(selectedFile);
        mediaFilename = selectedFile.name;
      }

      // Call edge function to send message
      const { error } = await supabase.functions.invoke('send-message', {
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

      if (error) {
        toast.error('Failed to send message');
        console.error('Error sending message:', error);
      } else {
        setNewMessage('');
        clearSelectedFile();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
      setUploadingMedia(false);
    }
  };

  // Send template message
  const handleSendTemplate = async (template: Template) => {
    if (!selectedConversation || !selectedNumber || !user) return;

    setSending(true);
    setShowTemplateDialog(false);

    try {
      const { error } = await supabase.functions.invoke('send-message', {
        body: {
          whatsapp_number_id: selectedNumber.id,
          to: selectedConversation.contact_phone,
          message_type: 'template',
          template_name: template.name,
          template_language: template.language,
        },
      });

      if (error) {
        toast.error('Failed to send template');
        console.error('Error sending template:', error);
      } else {
        toast.success('Template sent successfully');
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Failed to send template');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return format(date, 'HH:mm');
  };

  const formatConversationTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-chat-time" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-chat-time" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-chat-time" />;
      default:
        return null;
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact_phone.includes(searchQuery)
  );

  if (!selectedNumber) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No WhatsApp number selected
          </h2>
          <p className="text-muted-foreground">
            Please select or connect a WhatsApp number to view conversations.
          </p>
        </div>
      </div>
    );
  }

  // Mobile back button handler
  const handleBackToList = () => {
    setSelectedConversation(null);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Conversations List - Hidden on mobile when chat is selected */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-card",
        selectedConversation ? "hidden md:flex" : "flex"
      )}>
        {/* Search */}
        <div className="p-3 md:p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
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
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConversations.map((conversation) => (
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area - Full width on mobile when selected */}
      <div className={cn(
        "flex-1 flex flex-col",
        selectedConversation ? "flex" : "hidden md:flex"
      )}>
        {selectedConversation ? (
          <>
            {/* Chat Header with back button on mobile */}
            <div className="h-14 md:h-16 px-2 md:px-4 flex items-center justify-between border-b border-border bg-card">
              <div className="flex items-center gap-2 md:gap-3">
                {/* Back button - only on mobile */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden flex-shrink-0"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-9 w-9 md:h-10 md:w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {selectedConversation.contact_name?.[0] || selectedConversation.contact_phone[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground text-sm md:text-base truncate">
                    {selectedConversation.contact_name || selectedConversation.contact_phone}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.contact_phone}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-2 md:p-4">
              <div className="space-y-2 md:space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.direction === 'outbound' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[70%] px-3 md:px-4 py-2 rounded-2xl",
                        message.direction === 'outbound'
                          ? "bg-chat-outbound rounded-br-md"
                          : "bg-chat-inbound rounded-bl-md"
                      )}
                    >
                      {/* Render based on message type */}
                      {message.type === 'image' ? (
                        <div className="space-y-2">
                          {message.media_url ? (
                            <img 
                              src={message.media_url} 
                              alt="Image" 
                              className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.media_url || '', '_blank')}
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                              <span>Image</span>
                            </div>
                          )}
                          {message.content && message.content !== '[Image]' && (
                            <p className="text-sm text-foreground whitespace-pre-wrap">
                              {message.content}
                            </p>
                          )}
                        </div>
                      ) : message.type === 'video' ? (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Video className="h-4 w-4" />
                          <span>{message.content || 'Video'}</span>
                        </div>
                      ) : message.type === 'audio' ? (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Mic className="h-4 w-4" />
                          <span>{message.content || 'Audio'}</span>
                        </div>
                      ) : message.type === 'document' ? (
                        <div className="space-y-2">
                          {message.media_url ? (
                            <a 
                              href={message.media_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors p-2 bg-muted/50 rounded-lg"
                            >
                              <FileText className="h-5 w-5 flex-shrink-0" />
                              <span className="truncate">{message.content?.replace('[Document: ', '').replace(']', '') || 'Document'}</span>
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{message.content || 'Document'}</span>
                            </div>
                          )}
                        </div>
                      ) : message.type === 'location' ? (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{message.content || 'Location'}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {message.content}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-chat-time">
                          {formatMessageTime(message.created_at)}
                        </span>
                        {message.direction === 'outbound' && getMessageStatusIcon(message.status)}
                      </div>
                    </div>
                  </div>
                ))}
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
                    24-hour window expired. Use a template message to re-engage.
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={clearSelectedFile}
                    disabled={sending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2 md:gap-3"
              >
                {/* Hidden file input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,video/mp4,video/3gpp"
                  className="hidden"
                />
                
                {/* Attachment button */}
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
                  placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 h-10 md:h-11 text-sm md:text-base"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  variant="hero"
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
              <h3 className="text-lg font-medium text-foreground mb-1">
                Select a conversation
              </h3>
              <p className="text-sm text-muted-foreground">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Details Sidebar */}
      {selectedConversation && (
        <div className="hidden xl:block w-80 border-l border-border bg-card p-6">
          <div className="text-center mb-6">
            <Avatar className="h-20 w-20 mx-auto mb-3">
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {selectedConversation.contact_name?.[0] || <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-foreground text-lg">
              {selectedConversation.contact_name || 'Unknown'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {selectedConversation.contact_phone}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Contact Info
              </h4>
              <div className="bg-muted rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="text-foreground">{selectedConversation.contact_phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-foreground capitalize">{selectedConversation.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select a Template</DialogTitle>
            <DialogDescription>
              The 24-hour messaging window has expired. Choose an approved template to re-engage this contact.
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
    </div>
  );
}
