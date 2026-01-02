import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MessageSquare, Phone, MapPin } from "lucide-react";

export default function Contact() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to a backend
    alert("Thank you for your message! We'll get back to you soon.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have questions about HexaSend? We'd love to hear from you.
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
                      className="w-full"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                    Send Message
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
                  <h3 className="text-lg font-semibold text-gray-900">Live Chat</h3>
                </div>
                <p className="text-gray-600">
                  Available Monday - Friday
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  9:00 AM - 6:00 PM EST
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Phone className="h-6 w-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Phone Support</h3>
                </div>
                <p className="text-gray-600">
                  +918989997018
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
                  <h3 className="text-lg font-semibold text-gray-900">Office</h3>
                </div>
                <p className="text-gray-600">
                  office :78 shankar Bagh indore
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
  );
}