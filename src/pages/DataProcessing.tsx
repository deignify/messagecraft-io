import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function DataProcessing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">Data Processing Agreement</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              This Data Processing Agreement ("DPA") forms part of the Terms of Service between Chat Setu ("Processor") and you ("Controller") and governs the processing of personal data in connection with our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person</li>
              <li><strong>"Processing"</strong> means any operation performed on personal data</li>
              <li><strong>"Data Subject"</strong> means the individual to whom personal data relates</li>
              <li><strong>"Sub-processor"</strong> means any third party engaged by us to process personal data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Scope of Processing</h2>
            <h3 className="text-xl font-medium mb-3">3.1 Categories of Data Subjects</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your employees and authorized users</li>
              <li>Your customers and contacts</li>
              <li>Recipients of WhatsApp messages</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Types of Personal Data</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Contact information (phone numbers, names)</li>
              <li>Message content and metadata</li>
              <li>Conversation history</li>
              <li>Account and authentication data</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 Processing Activities</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Sending and receiving WhatsApp messages</li>
              <li>Storing conversation history</li>
              <li>Managing contact databases</li>
              <li>Executing automation workflows</li>
              <li>Generating analytics and reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Controller Obligations</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              As the Controller, you are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Ensuring lawful basis for processing</li>
              <li>Obtaining necessary consents from data subjects</li>
              <li>Responding to data subject requests</li>
              <li>Providing privacy notices to data subjects</li>
              <li>Ensuring accuracy of personal data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Processor Obligations</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              As the Processor, Chat Setu will:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Process personal data only on your documented instructions</li>
              <li>Ensure personnel are bound by confidentiality obligations</li>
              <li>Implement appropriate technical and organizational security measures</li>
              <li>Assist with data subject requests upon request</li>
              <li>Notify you of any personal data breach without undue delay</li>
              <li>Delete or return personal data upon termination</li>
              <li>Make available information to demonstrate compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Security Measures</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We implement the following security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Encryption of data in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Regular security assessments and penetration testing</li>
              <li>Incident response and business continuity procedures</li>
              <li>Employee security training and awareness</li>
              <li>Physical security at data center facilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Sub-processors</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use the following categories of sub-processors:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Meta/WhatsApp:</strong> Message delivery and WhatsApp API services</li>
              <li><strong>Cloud Infrastructure:</strong> Hosting and data storage</li>
              <li><strong>Analytics Providers:</strong> Usage analytics and monitoring</li>
              <li><strong>Payment Processors:</strong> Billing and payment processing</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We will notify you of any changes to sub-processors. You may object to new sub-processors within 30 days of notification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. International Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Personal data may be transferred to countries outside your jurisdiction. We ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by relevant authorities, for such transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Subject Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              We will assist you in responding to data subject requests to exercise their rights under applicable data protection laws, including rights of access, rectification, erasure, restriction, portability, and objection.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Data Breach Notification</h2>
            <p className="text-muted-foreground leading-relaxed">
              In the event of a personal data breach, we will notify you without undue delay (and in any event within 72 hours) after becoming aware of the breach, and provide information necessary for you to comply with your notification obligations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Audit Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Upon reasonable notice and subject to confidentiality obligations, we will make available information necessary to demonstrate compliance with this DPA and allow for audits conducted by you or a mandated auditor.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Term and Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              This DPA remains in effect for the duration of your use of our services. Upon termination, we will delete or return all personal data within 90 days, unless retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about this Data Processing Agreement:<br />
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
