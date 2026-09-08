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

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Phone className="h-6 w-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
                  </div>
                  <p className="text-gray-600 font-mono">
                    +91 89899 97018
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Business hours only
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <MapPin className="h-6 w-6 text-orange-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Headquarters</h3>
                  </div>
                  <p className="text-gray-600">
                    78 Shankar Bagh, Indore, Madhya Pradesh 452006, India
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-12 bg-blue-50 rounded-2xl p-8 border border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Frequently Asked Questions</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How secure is HexaSend?</h3>
                <p className="text-gray-600 text-sm">
                  Files are never stored on our servers. All transfers happen directly between devices, ensuring complete privacy.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">What file types are supported?</h3>
                <p className="text-gray-600 text-sm">
                  HexaSend supports all file types - documents, images, videos, archives, and more.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Is there a file size limit?</h3>
                <p className="text-gray-600 text-sm">
                  File size limits depend on your browser and device memory. Most files under 100MB work perfectly.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">How long do codes stay active?</h3>
                <p className="text-gray-600 text-sm">
                  Transfer codes expire after 1 hour for security. You'll need to generate a new code after that.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}