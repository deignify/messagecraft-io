import { MessageTemplate } from '@/lib/template-types';
import { cn } from '@/lib/utils';

interface TemplatePreviewProps {
  template: MessageTemplate;
  className?: string;
}

export function TemplatePreview({ template, className }: TemplatePreviewProps) {
  const renderBody = () => {
    let text = template.body_text;
    // Replace variables with placeholders
    Object.entries(template.variables || {}).forEach(([key, value]) => {
      text = text.replace(`{{${key}}}`, value || `[Variable ${key}]`);
    });
    return text;
  };

  return (
    <div className={cn("max-w-[280px] mx-auto", className)}>
      {/* Phone frame */}
      <div className="bg-muted rounded-3xl p-2 shadow-lg">
        <div className="bg-background rounded-2xl overflow-hidden">
          {/* Status bar */}
          <div className="h-6 bg-muted/50 flex items-center justify-center">
            <div className="w-16 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Chat area */}
          <div className="p-3 min-h-[300px] bg-[hsl(var(--muted)/0.3)]">
            {/* Message bubble */}
            <div className="max-w-[85%] bg-card rounded-lg rounded-tl-none shadow-sm overflow-hidden">
              {/* Header */}
              {template.header_type !== 'none' && (
                <div className="border-b border-border">
                  {template.header_type === 'text' && template.header_text && (
                    <div className="p-3 font-semibold text-sm">
                      {template.header_text}
                    </div>
                  )}
                  {template.header_type === 'image' && (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      {template.header_media_url ? (
                        <img
                          src={template.header_media_url}
                          alt="Header"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          [Image Header]
                        </span>
                      )}
                    </div>
                  )}
                  {template.header_type === 'video' && (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        [Video Header]
                      </span>
                    </div>
                  )}
                  {template.header_type === 'document' && (
                    <div className="p-3 bg-muted flex items-center gap-2">
                      <div className="w-8 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">PDF</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Document
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-3 text-sm whitespace-pre-wrap">
                {renderBody()}
              </div>

              {/* Footer */}
              {template.footer_text && (
                <div className="px-3 pb-2 text-xs text-muted-foreground">
                  {template.footer_text}
                </div>
              )}

              {/* Timestamp */}
              <div className="px-3 pb-2 flex justify-end">
                <span className="text-[10px] text-muted-foreground">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Buttons */}
              {template.buttons && template.buttons.length > 0 && (
                <div className="border-t border-border">
                  {template.buttons.map((button, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-2 text-center text-sm text-primary font-medium",
                        index < template.buttons.length - 1 && "border-b border-border"
                      )}
                    >
                      {button.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input area */}
          <div className="h-12 bg-muted/50 flex items-center px-3 gap-2">
            <div className="flex-1 h-8 bg-background rounded-full px-3 flex items-center">
              <span className="text-xs text-muted-foreground">Message</span>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
