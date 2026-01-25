import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UserPlus, Smartphone, Zap, MessageCircle, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create Your Account',
    description: 'Sign up in seconds and get instant access to your Chat Setu dashboard.',
  },
  {
    number: '02',
    icon: Smartphone,
    title: 'Connect WhatsApp',
    description: 'Link your WhatsApp Business API using our simple Meta OAuth integration.',
  },
  {
    number: '03',
    icon: Zap,
    title: 'Set Up Automations',
    description: 'Create automated responses, menu flows, and keyword triggers in minutes.',
  },
  {
    number: '04',
    icon: MessageCircle,
    title: 'Start Engaging',
    description: 'Manage all conversations from one inbox and watch your business grow.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Simple Setup
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Get Started in{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Four Easy Steps
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            No complex integrations or technical knowledge required. 
            Be up and running in less than 10 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
              )}
              
              <div className="relative bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <span className="text-5xl font-display font-bold text-muted-foreground/20">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button variant="hero" size="xl" asChild>
            <Link to="/signup">
              Start Your Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
