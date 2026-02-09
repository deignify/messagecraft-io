import { useState, useRef } from 'react';
import {
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  FileText,
  MapPin,
  Video,
  Mic,
  Play,
  Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/supabase-types';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  const getMessageStatusIcon = (status: string, errorMessage?: string | null) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-chat-time" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-chat-time" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-chat-time" />;
      case 'failed':
        return (
          <span title={errorMessage || 'Failed'} className="inline-flex">
            <AlertTriangle className="h-3 w-3 text-destructive" />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] md:max-w-[70%] px-3 md:px-4 py-2 rounded-2xl",
          isOutbound
            ? "bg-chat-outbound rounded-br-md"
            : "bg-chat-inbound rounded-bl-md"
        )}
      >
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
              <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ) : message.type === 'video' ? (
          <div className="space-y-2">
            {message.media_url ? (
              <video
                src={message.media_url}
                controls
                className="max-w-full rounded-lg"
                preload="metadata"
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Video className="h-4 w-4" />
                <span>{message.content || 'Video'}</span>
              </div>
            )}
          </div>
        ) : message.type === 'audio' ? (
          <VoiceMessagePlayer mediaUrl={message.media_url} content={message.content} />
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
                <span className="truncate">
                  {message.content?.replace('[Document: ', '').replace(']', '') || 'Document'}
                </span>
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
        ) : message.type === 'sticker' ? (
          message.media_url ? (
            <img src={message.media_url} alt="Sticker" className="max-w-[180px] rounded" />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">{message.content || '🏷️ Sticker'}</p>
          )
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
        )}

        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-chat-time">
            {format(new Date(message.created_at), 'HH:mm')}
          </span>
          {isOutbound && getMessageStatusIcon(message.status, (message as any).error_message)}
        </div>

        {isOutbound && message.status === 'failed' && (message as any).error_message && (
          <div className="mt-1 text-[11px] text-destructive text-right">
            {(message as any).error_message}
          </div>
        )}
      </div>
    </div>
  );
}

// Voice Message Player sub-component
function VoiceMessagePlayer({ mediaUrl, content }: { mediaUrl: string | null; content: string | null }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!mediaUrl) {
    return (
      <div className="flex items-center gap-2 text-sm text-foreground">
        <Mic className="h-4 w-4" />
        <span>{content || 'Audio'}</span>
      </div>
    );
  }

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(pct);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 min-w-[200px]">
      <audio
        ref={audioRef}
        src={mediaUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />
      <button
        onClick={togglePlay}
        className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 text-primary" />
        ) : (
          <Play className="h-4 w-4 text-primary ml-0.5" />
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div
          className="h-1.5 bg-muted rounded-full cursor-pointer overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {duration > 0 ? formatTime(duration) : '0:00'}
        </span>
      </div>
    </div>
  );
}
