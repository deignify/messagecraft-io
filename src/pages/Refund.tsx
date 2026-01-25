import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Refund Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Chat Setu, we want you to be satisfied with our services. This Refund Policy outlines the circumstances under which refunds may be granted and the process for requesting them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Subscription Cancellation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may cancel your subscription at any time through your account settings. Upon cancellation:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your subscription will remain active until the end of the current billing period</li>
              <li>You will not be charged for subsequent billing periods</li>
              <li>No partial refunds are provided for unused time in the current billing period</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Refund Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Refunds may be considered in the following circumstances:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Technical Issues:</strong> Persistent service issues that prevent you from using core features, and which we are unable to resolve within a reasonable timeframe</li>
              <li><strong>Billing Errors:</strong> Duplicate charges or incorrect billing amounts</li>
              <li><strong>Account Issues:</strong> If we are unable to verify your WhatsApp Business Account through no fault of your own</li>
              <li><strong>First-Time Users:</strong> Within 7 days of your first payment if the service does not meet your essential requirements as described</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Non-Refundable Items</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The following are generally not eligible for refunds:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Used messaging credits or API calls</li>
              <li>Setup fees or one-time charges</li>
              <li>Charges for periods where you actively used the service</li>
              <li>Account terminations due to policy violations</li>
              <li>Changes in your business needs or requirements</li>
              <li>Third-party fees (e.g., WhatsApp conversation charges)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. How to Request a Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To request a refund:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Contact our support team at <a href="mailto:contact@chatsetu.online" className="text-primary hover:underline">contact@chatsetu.online</a></li>
              <li>Include your account email and the reason for your request</li>
              <li>Provide any relevant documentation or evidence</li>
              <li>Allow up to 5 business days for review</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Refund Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Approved refunds will be processed within 5-10 business days to the original payment method. The actual time for the refund to appear in your account may vary depending on your financial institution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Pro-Rated Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              In cases of approved refunds for technical issues or service failures, we may offer pro-rated refunds based on the unused portion of your subscription period.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Enterprise and Custom Plans</h2>
            <p className="text-muted-foreground leading-relaxed">
              Refunds for enterprise or custom plans are handled on a case-by-case basis according to the terms specified in your service agreement. Please contact your account manager for assistance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Chargebacks</h2>
            <p className="text-muted-foreground leading-relaxed">
              We encourage you to contact us before initiating a chargeback with your bank. Chargebacks filed without first attempting to resolve the issue with us may result in account suspension and may affect your ability to use our services in the future.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our refund policy, please contact us at:<br />
              Email: <a href="mailto:contact@chatsetu.online" className="text-primary hover:underline">contact@chatsetu.online</a><br />
              Phone: <a href="tel:+919227154271" className="text-primary hover:underline">+91 92271 54271</a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
