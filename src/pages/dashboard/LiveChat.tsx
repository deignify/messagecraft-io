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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/lib/supabase-types';
import { format, isToday, isYesterday } from 'date-fns';

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

  return (
    <div className="h-[calc(100vh-64px)] flex">
      {/* Conversations List */}
      <div className="w-80 lg:w-96 border-r border-border flex flex-col bg-card">
        {/* Search */}
        <div className="p-4 border-b border-border">
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
                    "flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50",
                    selectedConversation?.id === conversation.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {conversation.contact_name?.[0] || conversation.contact_phone[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground truncate">
                        {conversation.contact_name || conversation.contact_phone}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {formatConversationTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-sm text-muted-foreground truncate">
                        {conversation.last_message_text || 'No messages'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
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

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 flex items-center justify-between border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConversation.contact_name?.[0] || selectedConversation.contact_phone[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-foreground">
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
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
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
                        "max-w-[70%] px-4 py-2 rounded-2xl",
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
            <div className="p-4 border-t border-border bg-card space-y-3">
              {/* File Preview */}
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="h-16 w-16 object-cover rounded" />
                  ) : (
                    <div className="h-16 w-16 flex items-center justify-center bg-primary/10 rounded">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
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
                className="flex items-center gap-3"
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
                  className="flex-1"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  variant="hero"
                  size="icon-lg"
                  disabled={(!newMessage.trim() && !selectedFile) || sending}
                >
                  {sending ? (
                    uploadingMedia ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )
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
    </div>
  );
}
