import { MessageTemplate } from '@/lib/template-types';
import { cn } from '@/lib/utils';
import { Image, Video, FileText, Link2, Phone, MessageSquare } from 'lucide-react';

interface TemplatePreviewProps {
  template: Partial<MessageTemplate>;
  className?: string;
}

export function TemplatePreview({ template, className }: TemplatePreviewProps) {
  const renderBody = () => {
    let text = template.body_text || '';
    // Replace variables with sample text or placeholders
    Object.entries(template.variables || {}).forEach(([key, value]) => {
      text = text.replace(`{{${key}}}`, value || `[Variable ${key}]`);
    });
    return text;
  };

  const getButtonIcon = (type: string) => {
    switch (type) {
      case 'url':
        return <Link2 className="h-4 w-4" />;
      case 'phone_number':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className={cn("max-w-[320px] mx-auto", className)}>
      {/* Phone frame - WhatsApp style */}
      <div className="bg-[#111B21] rounded-[2.5rem] p-3 shadow-2xl">
        <div className="bg-[#0B141A] rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="h-6 bg-[#202C33] flex items-center justify-center relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-5 bg-[#111B21] rounded-b-2xl" />
            </div>
          </div>

          {/* WhatsApp header */}
          <div className="h-14 bg-[#202C33] flex items-center px-4 gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2A3942] flex items-center justify-center">
              <span className="text-[#8696A0] text-sm font-medium">YB</span>
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">Your Business</p>
              <p className="text-[#8696A0] text-xs">Template Preview</p>
            </div>
          </div>

          {/* Chat area - WhatsApp background */}
          <div 
            className="p-4 min-h-[380px]"
            style={{
              backgroundColor: '#0B141A',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* Message bubble */}
            <div className="max-w-[90%] bg-[#202C33] rounded-lg rounded-tl-none shadow-sm overflow-hidden">
              {/* Header */}
              {template.header_type && template.header_type !== 'none' && (
                <div className="border-b border-[#374045]">
                  {template.header_type === 'text' && template.header_text && (
                    <div className="p-3 font-semibold text-white text-sm">
                      {template.header_text}
                    </div>
                  )}
                  {template.header_type === 'image' && (
                    <div className="aspect-video bg-[#374045] flex items-center justify-center">
                      {template.header_media_url ? (
                        <img
                          src={template.header_media_url}
                          alt="Header"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <Image className="h-8 w-8 mx-auto text-[#8696A0] mb-2" />
                          <span className="text-xs text-[#8696A0]">
                            Image Header
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {template.header_type === 'video' && (
                    <div className="aspect-video bg-[#374045] flex items-center justify-center">
                      <div className="text-center p-4">
                        <Video className="h-8 w-8 mx-auto text-[#8696A0] mb-2" />
                        <span className="text-xs text-[#8696A0]">
                          Video Header
                        </span>
                      </div>
                    </div>
                  )}
                  {template.header_type === 'document' && (
                    <div className="p-3 bg-[#374045] flex items-center gap-3">
                      <div className="w-10 h-12 bg-[#00A884] rounded flex items-center justify-center">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="text-sm text-white">Document</span>
                        <p className="text-xs text-[#8696A0]">PDF • Click to view</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-3 text-sm text-[#E9EDEF] whitespace-pre-wrap leading-relaxed">
                {renderBody() || 'Your message body will appear here...'}
              </div>

              {/* Footer */}
              {template.footer_text && (
                <div className="px-3 pb-2 text-xs text-[#8696A0]">
                  {template.footer_text}
                </div>
              )}

              {/* Timestamp */}
              <div className="px-3 pb-2 flex justify-end">
                <span className="text-[10px] text-[#8696A0]">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Buttons */}
              {template.buttons && template.buttons.length > 0 && (
                <div className="border-t border-[#374045]">
                  {template.buttons.map((button, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 text-center text-sm text-[#00A884] font-medium flex items-center justify-center gap-2",
                        index < template.buttons!.length - 1 && "border-b border-[#374045]"
                      )}
                    >
                      {getButtonIcon(button.type)}
                      {button.text || `Button ${index + 1}`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Input area - WhatsApp style */}
          <div className="h-14 bg-[#202C33] flex items-center px-3 gap-3">
            <div className="flex-1 h-10 bg-[#2A3942] rounded-full px-4 flex items-center">
              <span className="text-sm text-[#8696A0]">Message</span>
            </div>
            <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
