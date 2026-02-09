import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🫢', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬', '🤥', '🫠', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😵', '🤯', '🥳', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬'],
  'Gestures': ['👍', '👎', '👌', '🤌', '✌️', '🤞', '🫰', '🤙', '👋', '🤚', '🖐️', '✋', '🖖', '🫵', '👊', '✊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🙏', '💪', '🫡'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  'Objects': ['🎉', '🎊', '🎁', '🎈', '🔥', '⭐', '🌟', '✨', '💫', '🎯', '💡', '📌', '📎', '✅', '❌', '⚠️', '📞', '💬', '📧', '📝', '📋', '📊', '💰', '💳', '🏷️', '🔔', '🔒', '🔑', '⏰', '📅'],
};

type Category = keyof typeof EMOJI_CATEGORIES;

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('Smileys');
  const categories = Object.keys(EMOJI_CATEGORIES) as Category[];

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          disabled={disabled}
          title="Emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side="top"
        align="start"
        sideOffset={8}
      >
        {/* Category tabs */}
        <div className="flex gap-1 p-2 border-b overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Emoji grid */}
        <ScrollArea className="h-48 p-2">
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[activeCategory].map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
