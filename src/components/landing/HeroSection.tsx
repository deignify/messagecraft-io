import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowRight, Check, Sparkles } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-brand-50/30" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4" />
            <span>WhatsApp Cloud API Made Simple</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-foreground leading-tight mb-6 animate-slide-up">
            Automate Your{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              WhatsApp Business
            </span>{' '}
            at Scale
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Connect your WhatsApp Business API, manage conversations, automate responses, 
            and grow your business with our powerful platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="brand-outline" size="xl" asChild>
              <Link to="/pricing">
                View Pricing
              </Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Meta verified partner</span>
            </div>
          </div>
        </div>

        {/* Hero Image / Dashboard Preview */}
        <div className="mt-16 max-w-5xl mx-auto animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-brand opacity-20 blur-3xl rounded-3xl" />
            
            {/* Mock Dashboard */}
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Window bar */}
              <div className="h-10 bg-muted flex items-center px-4 gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/50" />
                <div className="h-3 w-3 rounded-full bg-status-pending/50" />
                <div className="h-3 w-3 rounded-full bg-status-active/50" />
              </div>
              
              {/* Mock content */}
              <div className="aspect-video bg-gradient-to-br from-surface-1 to-surface-2 p-6 lg:p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                  {/* Sidebar mock */}
                  <div className="hidden md:block bg-sidebar rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="h-4 w-20 bg-sidebar-accent rounded" />
                    </div>
                    <div className="space-y-2 mt-6">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-sidebar-accent rounded-lg" />
                      ))}
                    </div>
                  </div>
                  
                  {/* Chat mock */}
                  <div className="md:col-span-2 bg-card rounded-xl p-4 flex flex-col">
                    <div className="h-12 bg-muted rounded-lg mb-4 flex items-center px-3">
                      <div className="h-8 w-8 bg-primary/20 rounded-full" />
                      <div className="ml-3 space-y-1">
                        <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
                        <div className="h-2 w-16 bg-muted-foreground/10 rounded" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-start">
                        <div className="bg-chat-inbound rounded-2xl rounded-bl-md px-4 py-2 max-w-[70%]">
                          <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="bg-chat-outbound rounded-2xl rounded-br-md px-4 py-2 max-w-[70%]">
                          <div className="h-3 w-40 bg-primary/30 rounded" />
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-chat-inbound rounded-2xl rounded-bl-md px-4 py-2 max-w-[70%]">
                          <div className="h-3 w-48 bg-muted-foreground/20 rounded" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
