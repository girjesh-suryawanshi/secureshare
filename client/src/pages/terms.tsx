import { Card, CardContent } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms and Conditions</h1>
          <p className="text-lg text-gray-600">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="p-8 space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Agreement to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                By accessing and using HexaSend, you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Description of Service</h2>
              <p className="text-gray-600 leading-relaxed">
                HexaSend is a web-based file sharing service that allows users to transfer files between devices using 
                temporary 6-digit codes. Files are held temporarily in server memory during transfers and are automatically 
                deleted after completion or expiration.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceptable Use</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You agree to use HexaSend only for lawful purposes and in accordance with these Terms. You agree not to:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Upload, share, or distribute any illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or invasive content</li>
                <li>• Share files that infringe upon intellectual property rights, including copyrighted material without permission</li>
                <li>• Transmit any material that contains software viruses, malware, or any other malicious computer code</li>
                <li>• Use the service to spam, flood, or overwhelm our servers</li>
                <li>• Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>• Use the service for any commercial purposes without explicit permission</li>
                <li>• Share content that violates any local, state, national, or international law</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Responsibilities</h2>
              <p className="text-gray-600 leading-relaxed mb-4">As a user of HexaSend, you are responsible for:</p>
              <ul className="space-y-2 text-gray-600">
                <li>• Ensuring you have the right to share any files you upload</li>
                <li>• Protecting your transfer codes and sharing them only with intended recipients</li>
                <li>• Understanding that files are temporarily stored during transfers</li>
                <li>• Using the service at your own risk</li>
                <li>• Complying with all applicable laws and regulations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Limitations</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                HexaSend is provided "as is" with the following limitations:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Transfer codes expire after 1 hour</li>
                <li>• File size limits are determined by browser and device capabilities</li>
                <li>• Service availability is not guaranteed 24/7</li>
                <li>• We reserve the right to limit or terminate service for violations</li>
                <li>• Files may be lost due to technical issues or server problems</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Intellectual Property</h2>
              <p className="text-gray-600 leading-relaxed">
                The HexaSend service, including its design, functionality, and content, is owned by us and protected by copyright,
                trademark, and other applicable intellectual property laws. You may not copy, modify, distribute, or create derivative
                works based on our service without our prior written permission.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Privacy and Data</h2>
              <p className="text-gray-600 leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service, 
                to understand our practices regarding the collection and use of your information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Disclaimers</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                HexaSend is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, including:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Warranties of merchantability, fitness for a particular purpose, or non-infringement</li>
                <li>• That the service will be uninterrupted, secure, or error-free</li>
                <li>• That files will be successfully transferred or remain accessible</li>
                <li>• That our servers will be free from viruses or other harmful components</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-600 leading-relaxed">
                To the maximum extent permitted by law, HexaSend and its operators shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, including but not limited to loss of data,
                loss of profits, or business interruption, arising from your use of the service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-600 leading-relaxed">
                You agree to indemnify and hold harmless HexaSend, its operators, and affiliates from any claims,
                damages, losses, or expenses arising from your use of the service, your violation of these terms,
                or your violation of any rights of another party.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Termination</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to terminate or suspend your access to HexaSend immediately, without prior notice,
                for any violation of these Terms and Conditions or for any other reason we deem necessary to protect
                our service and other users.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Governing Law</h2>
              <p className="text-gray-600 leading-relaxed">
                These Terms and Conditions are governed by and construed in accordance with the laws of India,
                without regard to conflict of law principles.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify these Terms and Conditions at any time. Changes will be effective immediately 
                upon posting on this page. Your continued use of the service after changes are posted constitutes your 
                acceptance of the modified terms.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700">
                  Email: legal@hexasend.com<br />
                  Address: 78 Shankar Bagh, Indore, Madhya Pradesh, India
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}