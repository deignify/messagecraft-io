import { TrendingUp, Users, MessageSquare, Globe } from 'lucide-react';

const stats = [
  { icon: MessageSquare, value: '10M+', label: 'Messages Sent' },
  { icon: Users, value: '5,000+', label: 'Happy Businesses' },
  { icon: Globe, value: '50+', label: 'Countries Served' },
  { icon: TrendingUp, value: '99.9%', label: 'Uptime Guaranteed' },
];

export function StatsSection() {
  return (
    <section className="py-20 bg-gradient-brand">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="text-center animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
                <stat.icon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-2">
                {stat.value}
              </div>
              <div className="text-primary-foreground/80 text-sm font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
