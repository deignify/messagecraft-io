import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Rajesh Kumar',
    role: 'Hotel Owner',
    company: 'Grand Palace Hotel',
    content: 'Chat Setu transformed our guest communication. Automated booking confirmations and check-in reminders have reduced our front desk workload by 60%.',
    rating: 5,
    avatar: 'RK',
  },
  {
    name: 'Priya Sharma',
    role: 'E-commerce Manager',
    company: 'StyleMart India',
    content: 'We handle 500+ customer queries daily. The automation features and template messages have made our customer support incredibly efficient.',
    rating: 5,
    avatar: 'PS',
  },
  {
    name: 'Mohammed Ali',
    role: 'Restaurant Owner',
    company: 'Spice Garden',
    content: 'Order confirmations, delivery updates, feedback collection - everything is automated now. Our customers love the instant responses!',
    rating: 5,
    avatar: 'MA',
  },
  {
    name: 'Anita Desai',
    role: 'Clinic Administrator',
    company: 'HealthFirst Clinic',
    content: 'Appointment reminders via WhatsApp reduced our no-shows by 40%. The platform is intuitive and the support team is excellent.',
    rating: 5,
    avatar: 'AD',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-surface-1">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Trusted by{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Businesses Across India
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our customers have to say about their experience with Chat Setu.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.name}
              className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
