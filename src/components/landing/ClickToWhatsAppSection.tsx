import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, MousePointerClick, TrendingUp, TrendingDown, Target, BarChart3, Zap } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    stat: '5X',
    label: 'More Leads',
    description: 'Convert ad clicks into WhatsApp conversations instantly',
  },
  {
    icon: TrendingDown,
    stat: '60%',
    label: 'Lower Cost',
    description: 'Reduce cost per lead compared to traditional landing pages',
  },
  {
    icon: Target,
    stat: '3X',
    label: 'Better ROI',
    description: 'Higher conversion rates with direct WhatsApp engagement',
  },
];

const steps = [
  {
    icon: MousePointerClick,
    title: 'User Clicks Ad',
    description: 'Customer sees your Facebook or Instagram ad and taps the CTA button.',
  },
  {
    icon: Zap,
    title: 'Opens WhatsApp',
    description: 'They land directly in a WhatsApp chat with your business — no forms, no friction.',
  },
  {
    icon: BarChart3,
    title: 'Track & Convert',
    description: 'Chat Setu captures the lead, tracks attribution, and lets your team respond instantly.',
  },
];

export function ClickToWhatsAppSection() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute top-20 right-10 w-96 h-96 bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-accent rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <MousePointerClick className="h-4 w-4" />
            Click To WhatsApp Ads
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-foreground mb-6">
            Turn Ad Clicks Into{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              WhatsApp Conversations
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Boost leads by 5X and cut costs by 60% using Facebook & Instagram Ads 
            powered by Chat Setu WhatsApp. Skip the landing page — go straight to conversations.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 max-w-4xl mx-auto">
          {benefits.map((benefit) => (
            <div
              key={benefit.label}
              className="group relative bg-card rounded-2xl p-8 border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-center"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <benefit.icon className="h-7 w-7" />
              </div>
              <div className="text-4xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent mb-1">
                {benefit.stat}
              </div>
              <div className="text-lg font-semibold text-foreground mb-2">{benefit.label}</div>
              <p className="text-sm text-muted-foreground">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* How it works flow */}
        <div className="max-w-5xl mx-auto mb-16">
          <h3 className="text-2xl font-display font-bold text-foreground text-center mb-12">
            How Click-to-WhatsApp Ads Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector lines (desktop) */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />

            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                <div className="relative z-10 h-24 w-24 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center mx-auto mb-6 shadow-md">
                  <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <step.icon className="h-10 w-10 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="hero" size="xl" asChild>
            <Link to="/signup">
              Get Started with CTWA Ads
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <p className="mt-4 text-sm text-muted-foreground">
            No credit card required • Works with existing Meta Ads
          </p>
        </div>
      </div>
    </section>
  );
}
