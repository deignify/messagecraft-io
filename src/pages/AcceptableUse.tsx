import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function AcceptableUse() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Acceptable Use Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Purpose</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Acceptable Use Policy ("AUP") governs your use of Chat Setu's services and is designed to protect our users, partners, and the integrity of our platform. By using our services, you agree to comply with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Messaging Guidelines</h2>
            <h3 className="text-xl font-medium mb-3">2.1 Consent Requirements</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Obtain explicit opt-in consent before sending messages</li>
              <li>Maintain records of consent for each recipient</li>
              <li>Honor opt-out requests immediately (within 24 hours maximum)</li>
              <li>Provide clear opt-out instructions in all messages</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Message Content</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Messages must be relevant to your business relationship with the recipient</li>
              <li>Clearly identify your business in all communications</li>
              <li>Do not send misleading or deceptive content</li>
              <li>Respect messaging windows and template requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You may NOT use Chat Setu services to:
            </p>
            
            <h3 className="text-xl font-medium mb-3">3.1 Spam and Unsolicited Messaging</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Send bulk unsolicited messages</li>
              <li>Purchase or use contact lists without proper consent</li>
              <li>Send messages to randomly generated numbers</li>
              <li>Engage in message bombing or flooding</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Illegal Content</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Distribute illegal goods or services</li>
              <li>Promote violence, terrorism, or hate speech</li>
              <li>Share child exploitation material</li>
              <li>Facilitate fraud, scams, or phishing</li>
              <li>Infringe intellectual property rights</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 Harmful Activities</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Distribute malware, viruses, or harmful code</li>
              <li>Attempt to bypass security measures</li>
              <li>Harvest or scrape user data</li>
              <li>Impersonate others or misrepresent identity</li>
              <li>Interfere with service operation</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.4 Regulated Industries</h3>
            <p className="text-muted-foreground mb-2">
              Special requirements apply for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Financial services and lending</li>
              <li>Healthcare and pharmaceuticals</li>
              <li>Gambling and gaming</li>
              <li>Adult content (prohibited)</li>
              <li>Alcohol, tobacco, and cannabis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Technical Requirements</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Respect API rate limits and quotas</li>
              <li>Implement proper error handling</li>
              <li>Maintain secure API credentials</li>
              <li>Do not attempt to reverse engineer our systems</li>
              <li>Report security vulnerabilities responsibly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. WhatsApp Business Policy Compliance</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must comply with all WhatsApp Business policies, including the WhatsApp Business Policy, Commerce Policy, and Business Messaging Policy. Violations of WhatsApp policies may result in account suspension by both WhatsApp and Chat Setu.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Monitoring and Enforcement</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We monitor usage to ensure compliance. Violations may result in:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Warning notifications</li>
              <li>Temporary service suspension</li>
              <li>Permanent account termination</li>
              <li>Legal action in severe cases</li>
              <li>Reporting to relevant authorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Reporting Violations</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you become aware of any violations of this policy, please report them to abuse@chatsetu.com. We investigate all reports and take appropriate action.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Policy Updates</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy to reflect changes in our services or legal requirements. We will notify you of material changes. Continued use of our services constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Acceptable Use Policy:<br />
              Email: compliance@chatsetu.com<br />
              Abuse Reports: abuse@chatsetu.com
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
