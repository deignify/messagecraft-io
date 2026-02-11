import {
  MessageCircle,
  Users,
  Zap,
  FileText,
  Shield,
  BarChart3,
  Clock,
  Globe,
  UserCog,
  MousePointerClick,
} from 'lucide-react';

const features = [
  {
    icon: MessageCircle,
    title: 'Live Chat',
    description: 'Real-time messaging with your customers. See message status, manage conversations, and never miss a lead.',
  },
  {
    icon: Zap,
    title: 'Smart Automation',
    description: 'Create automated workflows for common queries. Set up keyword triggers and menu-based responses.',
  },
  {
    icon: MousePointerClick,
    title: 'Click To WhatsApp Ads',
    description: 'Boost leads by 5X and cut costs by 60% with Facebook & Instagram ads that open directly in WhatsApp.',
  },
  {
    icon: UserCog,
    title: 'Advanced Team Management',
    description: 'Assign chats, track agent performance, and collaborate efficiently with Admin, Manager & Agent roles.',
  },
  {
    icon: Users,
    title: 'Contact Management',
    description: 'Organize contacts with tags and categories. Import bulk contacts via CSV and send targeted campaigns.',
  },
  {
    icon: FileText,
    title: 'Template Messages',
    description: 'Sync and send approved Meta templates. Track template status and manage parameters easily.',
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Enterprise-grade security with encrypted data. Full compliance with Meta policies and GDPR.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Performance',
    description: 'Track response times, resolution rates, and agent performance. Make data-driven decisions.',
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Your automated responses work around the clock. Never leave a customer waiting.',
  },
  {
    icon: Globe,
    title: 'Multi-Number Support',
    description: 'Connect unlimited WhatsApp numbers. Manage all your business lines from one dashboard.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-surface-2">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Everything you need to{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              scale your business
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our comprehensive platform gives you all the tools to manage, automate, 
            and grow your WhatsApp business communications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
