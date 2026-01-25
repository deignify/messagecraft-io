import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-display font-bold mb-8">User Data Deletion</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 25, 2026</p>
        
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Your Right to Delete Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Chat Setu, we respect your right to control your personal data. You have the right to request the deletion of your personal data that we have collected and stored. This page explains how you can request data deletion and what to expect from the process.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. What Data Can Be Deleted</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Upon your request, we can delete the following data:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your account profile information (name, email, company details)</li>
              <li>WhatsApp Business Account connections and configurations</li>
              <li>Contact lists and customer data you've imported</li>
              <li>Message history and conversation logs</li>
              <li>Automation workflows and templates you've created</li>
              <li>Analytics and usage data</li>
              <li>Any other personal data associated with your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Retention Exceptions</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Some data may be retained even after a deletion request due to legal or operational requirements:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Legal Compliance:</strong> Data required for tax, legal, or regulatory purposes</li>
              <li><strong>Transaction Records:</strong> Billing and payment records as required by law</li>
              <li><strong>Fraud Prevention:</strong> Data necessary to prevent fraud or abuse</li>
              <li><strong>Aggregated Data:</strong> Anonymized, aggregated data that cannot identify you</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. How to Request Data Deletion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You can request data deletion through any of the following methods:
            </p>
            
            <h3 className="text-xl font-medium mb-3">Option 1: In-App Deletion</h3>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
              <li>Log in to your Chat Setu account</li>
              <li>Navigate to Settings → Account</li>
              <li>Click on "Delete My Account"</li>
              <li>Confirm your identity and the deletion request</li>
            </ol>

            <h3 className="text-xl font-medium mb-3">Option 2: Email Request</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Send an email to <a href="mailto:contact@chatsetu.online" className="text-primary hover:underline">contact@chatsetu.online</a> with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Subject line: "Data Deletion Request"</li>
              <li>Your registered email address</li>
              <li>Your account name or ID (if known)</li>
              <li>A clear statement that you want your data deleted</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">Option 3: Phone Request</h3>
            <p className="text-muted-foreground leading-relaxed">
              Call us at <a href="tel:+919227154271" className="text-primary hover:underline">+91 92271 54271</a> during business hours (Mon-Fri, 10am-6pm IST) to request data deletion. You will need to verify your identity before we can process the request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Verification Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              To protect your data from unauthorized deletion, we will verify your identity before processing any deletion request. This may include confirming your email address, phone number, or other account details. We will never share your data with third parties as part of this verification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Timeline for Deletion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Once we receive and verify your deletion request:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Acknowledgment:</strong> Within 24-48 hours of receiving your request</li>
              <li><strong>Processing:</strong> Within 30 days from verification</li>
              <li><strong>Backup Removal:</strong> Data in backups may take up to 90 days to be fully purged</li>
              <li><strong>Confirmation:</strong> We will notify you once deletion is complete</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Consequences of Data Deletion</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Please be aware that once your data is deleted:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Your account will be permanently closed</li>
              <li>You will lose access to all conversations and message history</li>
              <li>All contacts and customer data will be permanently removed</li>
              <li>Automation workflows and templates will be deleted</li>
              <li>This action cannot be undone</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Data shared with third parties (such as WhatsApp/Meta for message delivery) is subject to their respective data retention policies. We will make reasonable efforts to request deletion from our sub-processors, but cannot guarantee deletion of data already processed by third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For data deletion requests or questions about your data:<br />
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
