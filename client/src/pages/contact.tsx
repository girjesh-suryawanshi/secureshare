import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Phone, MapPin, Loader2 } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      toast({
        title: "Message Sent!",
        description: "Thank you for contacting HexaSend. We will reply to your email shortly.",
      });

      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        subject: "",
        message: ""
      });
    } catch (error: any) {
      toast({
        title: "Submission Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact Us | HexaSend Support & Inquiries"
        description="Have questions about sending large files or encountered an issue? Contact the HexaSend team. We are here to help you share your data securely and efficiently."
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions or feedback about HexaSend? We'd love to hear from you.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-xl">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <Input
                          type="text"
                          required
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="w-full"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <Input
                          type="text"
                          required
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="w-full"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subject
                      </label>
                      <Input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full"
                        placeholder="How can we help you?"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Message
                      </label>
                      <Textarea
                        required
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full"
                        placeholder="Tell us more about your inquiry..."
                      />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending Message...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Mail className="h-6 w-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Email Support</h3>
                  </div>
                  <p className="text-gray-600">
                    support@hexasend.com
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    We typically respond within 24 hours
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Live Support</h3>
                  </div>
                  <p className="text-gray-600">
                    Available Monday - Friday
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    9:00 AM - 6:00 PM IST
                  </p>
                </CardContent>
              </Card>

            </div>
          </div>

          <div className="mt-12 bg-blue-50 rounded-2xl p-8 border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h2>
            <p className="text-center text-gray-600 mb-6 max-w-xl mx-auto">Before reaching out, check if your question is already answered below. Most common questions are answered here.</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How secure is HexaSend?</h3>
                <p className="text-gray-600 text-sm">
                  All transfers use industry-standard TLS encryption during transit. Files transferred over the internet are temporarily stored for up to 24 hours to facilitate delivery, then permanently deleted. We never sell or share your data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What file types are supported?</h3>
                <p className="text-gray-600 text-sm">
                  HexaSend supports all common file types — documents (PDF, DOCX, XLSX), images (JPG, PNG, GIF), videos (MP4, MOV), archives (ZIP, RAR), and more. Files containing prohibited content (malware, CSAM) are blocked by our content policy.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is there a file size limit?</h3>
                <p className="text-gray-600 text-sm">
                  Individual files up to 20 MB are supported. You can send multiple files at once — they are automatically packaged into a single ZIP archive for the receiver to download. For larger transfers, use our local network mode which has no size limits.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How long do codes stay active?</h3>
                <p className="text-gray-600 text-sm">
                  Transfer codes and your uploaded files remain active for up to 24 hours. After that, both the code and the file are automatically and permanently deleted from our servers. You will need to generate a new code for each new transfer.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Do I need to create an account?</h3>
                <p className="text-gray-600 text-sm">
                  No account is ever required. HexaSend is designed to be completely signup-free. Just visit the homepage, drag and drop your file, and share the 6-digit code. The receiver can download your file without signing in either.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Can I use HexaSend on my phone?</h3>
                <p className="text-gray-600 text-sm">
                  Yes! HexaSend is fully responsive and works on iOS (Safari) and Android (Chrome). No app download needed — just open hexasend.com in your mobile browser and start sharing. It works seamlessly between phones, tablets, and computers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What happens if the receiver doesn't download in time?</h3>
                <p className="text-gray-600 text-sm">
                  If the file is not downloaded within 24 hours, it is permanently deleted. You will need to re-upload and share a new code. We recommend sharing the code immediately after uploading for the best experience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is HexaSend really free to use?</h3>
                <p className="text-gray-600 text-sm">
                  Yes. HexaSend is completely free for all users. There are no hidden fees, no premium tiers, and no subscription required. The service is supported by non-intrusive display advertising that helps us keep the servers running.
                </p>
              </div>
            </div>

            <div className="mt-8 bg-white rounded-xl p-6 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">What to Expect When You Contact Us</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Response Time:</strong> We aim to respond to all inquiries within 24 business hours (Monday–Friday, 9 AM–6 PM IST).</li>
                <li>• <strong>Support Scope:</strong> We handle questions about file transfers, technical issues, content policy concerns, and partnership inquiries.</li>
                <li>• <strong>Copyright / Takedown Requests:</strong> For DMCA or content removal, please use our <a href="/report-abuse" className="text-blue-600 hover:underline">Report Abuse</a> page for the fastest response.</li>
                <li>• <strong>Bug Reports:</strong> Please include your browser version, operating system, and a description of what happened. Screenshots are helpful.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}