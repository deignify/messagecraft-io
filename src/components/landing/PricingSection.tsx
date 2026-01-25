import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '₹999',
    period: '/month',
    description: 'Perfect for small businesses just getting started.',
    features: [
      '1 WhatsApp Number',
      '1,000 Messages/month',
      'Basic Automation',
      'Live Chat Support',
      'Template Messages',
      'Contact Management',
    ],
    popular: false,
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '₹2,999',
    period: '/month',
    description: 'For growing businesses that need more power.',
    features: [
      '3 WhatsApp Numbers',
      '10,000 Messages/month',
      'Advanced Automation',
      'Priority Support',
      'Analytics Dashboard',
      'Team Collaboration',
      'API Access',
      'Custom Integrations',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations with custom needs.',
    features: [
      'Unlimited Numbers',
      'Unlimited Messages',
      'Custom Automation',
      'Dedicated Support',
      'Advanced Analytics',
      'White-label Option',
      'SLA Guarantee',
      'Custom Development',
    ],
    popular: false,
    cta: 'Contact Sales',
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-surface-2">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Simple, Transparent{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={plan.name}
              className={`relative bg-card rounded-2xl p-8 border-2 transition-all duration-300 animate-slide-up ${
                plan.popular
                  ? 'border-primary shadow-xl scale-105'
                  : 'border-border hover:border-primary/30 hover:shadow-lg'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-brand rounded-full text-primary-foreground text-sm font-medium">
                  Most Popular
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-display font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.popular ? 'hero' : 'brand-outline'}
                className="w-full"
                asChild
              >
                <Link to={plan.name === 'Enterprise' ? '/contact' : '/signup'}>
                  {plan.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
