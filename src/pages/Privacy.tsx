import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              ChatFlow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our WhatsApp Cloud API platform and related services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3">2.1 Account Information</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Name and email address</li>
              <li>Company name and business information</li>
              <li>Payment and billing information</li>
              <li>Authentication credentials</li>
            </ul>
            
            <h3 className="text-xl font-medium mb-3 mt-6">2.2 WhatsApp Business Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>WhatsApp Business Account information</li>
              <li>Phone numbers and display names</li>
              <li>Message content and metadata (as necessary to provide the service)</li>
              <li>Contact information of your customers</li>
              <li>Message templates and automation configurations</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.3 Usage Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Log data and analytics</li>
              <li>Device and browser information</li>
              <li>IP addresses and location data</li>
              <li>Feature usage patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>To provide and maintain our services</li>
              <li>To process transactions and send related information</li>
              <li>To send administrative information and updates</li>
              <li>To respond to inquiries and provide customer support</li>
              <li>To improve our services and develop new features</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal information. We may share your data with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Meta/WhatsApp:</strong> As required to provide WhatsApp Cloud API services</li>
              <li><strong>Service Providers:</strong> Third-party vendors who assist in our operations</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit and at rest, access controls, regular security assessments, and secure data centers. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide services. Message data is retained according to your settings and WhatsApp's policies. You may request deletion of your data at any time, subject to legal retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:<br />
              Email: privacy@chatflow.com<br />
              Address: [Your Business Address]
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
