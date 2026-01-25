import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'What is the WhatsApp Business API?',
    answer: 'The WhatsApp Business API is a solution for medium and large businesses to communicate with customers at scale. Unlike the regular WhatsApp Business app, it allows automation, integration with CRM systems, and handling high message volumes. Chat Setu helps you leverage this API without any technical complexity.',
  },
  {
    question: 'Do I need a Meta Business account?',
    answer: 'Yes, to use the WhatsApp Business API, you need a verified Meta Business account. Don\'t worry - our onboarding process guides you through the entire setup, and our support team is available to help.',
  },
  {
    question: 'How does the 14-day free trial work?',
    answer: 'You get full access to all features in your chosen plan for 14 days. No credit card required to start. If you love Chat Setu (and we think you will!), simply add your payment details to continue after the trial.',
  },
  {
    question: 'Can I change my plan later?',
    answer: 'Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate any billing differences.',
  },
  {
    question: 'What happens if I exceed my message limit?',
    answer: 'We\'ll notify you when you\'re approaching your limit. You can either upgrade your plan or purchase additional message credits. We never cut off your service without warning.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, security is our top priority. We use enterprise-grade encryption, comply with GDPR and Indian data protection laws, and never share your data with third parties. All messages are encrypted in transit and at rest.',
  },
  {
    question: 'Do you offer custom integrations?',
    answer: 'Yes! Our Professional and Enterprise plans include API access for custom integrations. We can connect Chat Setu with your CRM, booking system, or any other software you use.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support with quick response times. Professional plans get priority support, and Enterprise customers receive dedicated account managers and phone support.',
  },
];

export function FAQSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Frequently Asked{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about Chat Setu and WhatsApp Business API.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:border-primary/30 data-[state=open]:shadow-lg transition-all"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
