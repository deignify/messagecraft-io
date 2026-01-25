import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using ChatFlow's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              ChatFlow provides a platform for managing WhatsApp Business communications through the WhatsApp Cloud API. Our services include message sending and receiving, contact management, message templates, automation tools, and analytics.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You must be at least 18 years old to use our services</li>
              <li>One person or entity may not maintain more than one account without approval</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. WhatsApp Business Compliance</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree to comply with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>WhatsApp Business Policy</li>
              <li>WhatsApp Commerce Policy</li>
              <li>Meta's Terms of Service</li>
              <li>All applicable messaging regulations in your jurisdiction</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Send spam or unsolicited messages</li>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Distribute malware or harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Use the service for illegal or fraudulent purposes</li>
              <li>Resell or redistribute our services without authorization</li>
              <li>Interfere with or disrupt the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Payment Terms</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Fees are charged according to your selected plan</li>
              <li>All fees are non-refundable unless otherwise specified</li>
              <li>We may change pricing with 30 days notice</li>
              <li>You are responsible for all applicable taxes</li>
              <li>Overdue amounts may incur late fees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, and functionality of ChatFlow are owned by us and protected by international copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data and Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of our services is subject to our Privacy Policy. You are responsible for ensuring you have appropriate consent to collect and process your customers' data through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive for high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue any aspect of our services at any time. Planned maintenance will be communicated in advance when possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHATFLOW SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR BUSINESS OPPORTUNITIES, REGARDLESS OF WHETHER WE WERE ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify and hold harmless ChatFlow and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of our services or violation of these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account at any time for violations of these terms. Upon termination, your right to use the service ceases immediately. You may export your data before termination upon request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will provide notice of material changes. Continued use of our services after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at:<br />
              Email: legal@chatflow.com<br />
              Address: [Your Business Address]
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
