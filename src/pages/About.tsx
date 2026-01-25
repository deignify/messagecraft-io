import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { MessageSquare, Users, Zap, Shield, Globe, Award } from 'lucide-react';

const values = [
  {
    icon: MessageSquare,
    title: 'Customer-First Communication',
    description: 'We believe in making business communication seamless and personal. Every feature we build is designed to help you connect better with your customers.',
  },
  {
    icon: Shield,
    title: 'Security & Compliance',
    description: 'Your data security is our priority. We implement enterprise-grade security measures and maintain full compliance with WhatsApp Business policies and data protection regulations.',
  },
  {
    icon: Zap,
    title: 'Innovation',
    description: 'We continuously innovate to bring you the latest in messaging automation, AI-powered responses, and intelligent workflow tools.',
  },
  {
    icon: Users,
    title: 'Empowering Businesses',
    description: 'From startups to enterprises, we empower businesses of all sizes to scale their WhatsApp communications effectively.',
  },
];

const stats = [
  { value: '10K+', label: 'Messages Sent Daily' },
  { value: '500+', label: 'Businesses Trust Us' },
  { value: '99.9%', label: 'Uptime Guarantee' },
  { value: '24/7', label: 'Customer Support' },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-brand-50/30" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-6">
                <Globe className="h-4 w-4" />
                <span>About Chat Setu</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-foreground leading-tight mb-6">
                Connecting Businesses with{' '}
                <span className="bg-gradient-brand bg-clip-text text-transparent">
                  Their Customers
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Chat Setu is a powerful WhatsApp Cloud API platform designed to help businesses automate, manage, and scale their customer communications. We bridge the gap between businesses and their customers through seamless WhatsApp integration.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-surface-2">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-3xl sm:text-4xl font-display font-bold text-primary mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-3xl font-display font-bold mb-6">Our Mission</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    At Chat Setu, our mission is to democratize business communication by making WhatsApp Business API accessible, affordable, and easy to use for businesses of all sizes.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    We understand that in today's fast-paced world, customers expect instant, personalized responses. That's why we've built a platform that combines powerful automation with human touch, ensuring your customers always feel valued and heard.
                  </p>
                </div>
                <div className="bg-gradient-brand rounded-2xl p-8 text-center">
                  <Award className="h-16 w-16 text-primary-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-primary-foreground mb-2">
                    Meta Business Partner
                  </h3>
                  <p className="text-primary-foreground/80 text-sm">
                    Officially verified to provide WhatsApp Business API solutions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-surface-2">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-display font-bold mb-4">Our Values</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                These core values guide everything we do at Chat Setu
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="bg-card rounded-2xl p-6 border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-display font-bold mb-4">
                Ready to Transform Your Business Communication?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join hundreds of businesses already using Chat Setu to connect with their customers on WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="/signup"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gradient-brand text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                >
                  Get Started Free
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="py-16 bg-surface-2">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-display font-bold mb-4">Get in Touch</h2>
              <p className="text-muted-foreground mb-6">
                Have questions about Chat Setu? We'd love to hear from you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
                <a
                  href="mailto:contact@chatsetu.online"
                  className="text-primary hover:underline"
                >
                  contact@chatsetu.online
                </a>
                <span className="hidden sm:block text-muted-foreground">•</span>
                <a
                  href="tel:+919227154271"
                  className="text-primary hover:underline"
                >
                  +91 92271 54271
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
