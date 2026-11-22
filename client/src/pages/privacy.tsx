import { Card, CardContent } from "@/components/ui/card";
import { SEOHead } from "@/components/seo-head";

export default function Privacy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy | HexaSend Secure Transfers"
        description="Read the HexaSend Privacy Policy. Understand how our file transfers work and how we handle your data."
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-lg text-gray-600">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="p-8 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Commitment to Privacy</h2>
                <p className="text-gray-600 leading-relaxed">
                  At HexaSend, we are committed to protecting your privacy and ensuring the security of your data.
                  This Privacy Policy explains how we collect, use, and protect information when you use our file sharing service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information We Collect</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Files and Content</h3>
                    <p className="text-gray-600 leading-relaxed">
                      When you use HexaSend to send files, your files are temporarily stored on our servers to facilitate the transfer process.
                      Files are automatically deleted from our servers after 24 hours or once successfully downloaded, whichever comes first.
                      We do not permanently store or analyze your files.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Technical Information</h3>
                    <p className="text-gray-600 leading-relaxed">
                      We collect minimal technical information including IP addresses, browser type, and connection timestamps
                      solely for service functionality and security purposes. This information is not linked to your identity
                      and is automatically deleted after 24 hours.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Transfer Codes</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Six-digit transfer codes are generated randomly and exist only during active transfers.
                      Codes expire after 24 hours and cannot be reused.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Information</h2>
                <ul className="space-y-2 text-gray-600">
                  <li>• Facilitate file transfers between your devices</li>
                  <li>• Generate and manage temporary transfer codes</li>
                  <li>• Ensure service security and prevent abuse</li>
                  <li>• Monitor service performance and reliability</li>
                  <li>• Comply with legal obligations when required</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Information Sharing and Disclosure</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We do not sell, rent, or share your personal information or files with third parties, except in the following limited circumstances:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• When required by law or legal process</li>
                  <li>• To protect our rights, property, or safety</li>
                  <li>• To prevent fraud or security threats</li>
                  <li>• With your explicit consent</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Security</h2>
                <p className="text-gray-600 leading-relaxed">
                  We implement industry-standard security measures to protect your information during transmission and temporary storage.
                  All connections use HTTPS encryption. Files are temporarily stored to facilitate the transfer and then permanently deleted.
                  However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention</h2>
                <p className="text-gray-600 leading-relaxed">
                  Files and transfer codes are automatically deleted from our systems after 24 hours or upon successful download completion.
                  Technical logs are retained for up to 24 hours for security and performance monitoring purposes,
                  then permanently deleted.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Since we don't store personal information or files permanently, traditional data rights like access,
                  correction, or deletion don't apply in the usual sense. However, you have the right to:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Stop using our service at any time</li>
                  <li>• Contact us with privacy concerns</li>
                  <li>• Request information about our privacy practices</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Cookies and Tracking</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  HexaSend uses cookies and similar technologies for essential service functionality, such as maintaining your
                  session connection, and may also use analytics and advertising cookies to understand how the service is used
                  and to display relevant content and ads.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Where required by law, we will request your consent before setting non-essential cookies. You can control or
                  delete cookies through your browser settings at any time, but disabling certain cookies may impact how the
                  service functions.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Google AdSense and Third-Party Advertising</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  HexaSend works with third-party advertising vendors, including Google, to serve relevant advertisements to visitors.
                  Third-party vendors, including Google, use cookies (such as the DoubleClick cookie) to serve ads based on a user&apos;s prior visits
                  to our website or other websites across the Internet.
                </p>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Google&apos;s use of advertising cookies enables it and its partners to serve ads to our users based on their visit to HexaSend
                  and/or other sites on the Internet.
                </p>
                <p className="text-gray-600 leading-relaxed mb-4">
                  To learn more about how Google uses information from sites or apps that use their services, please review the{" "}
                  <a
                    href="https://policies.google.com/technologies/partner-sites"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Google Privacy &amp; Terms Partner Policy
                  </a>.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Users may opt out of personalized advertising by visiting{" "}
                  <a
                    href="https://adssettings.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Google Ads Settings
                  </a>. Alternatively, you can opt out of third-party vendors&apos; use of cookies for personalized advertising by visiting{" "}
                  <a
                    href="https://www.aboutads.info/choices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    www.aboutads.info/choices
                  </a>{" "}
                  or{" "}
                  <a
                    href="https://www.youronlinechoices.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Your Online Choices
                  </a>.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Children's Privacy</h2>
                <p className="text-gray-600 leading-relaxed">
                  Our service is not intended for children under 13 years of age. We do not knowingly collect
                  personal information from children under 13. If you believe we have collected information
                  from a child under 13, please contact us immediately.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">International Users</h2>
                <p className="text-gray-600 leading-relaxed">
                  HexaSend may process information on servers located in different regions. By using the service, you understand
                  and agree that your information may be transferred to, stored, and processed in countries where we or our
                  service providers operate, which may have data protection laws different from those in your country of
                  residence.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Changes to This Policy</h2>
                <p className="text-gray-600 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by
                  posting the new Privacy Policy on this page and updating the "Last updated" date.
                  Changes become effective immediately upon posting.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
                <p className="text-gray-600 leading-relaxed">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">
                    Email: privacy@hexasend.com
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}