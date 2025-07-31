import { Card, CardContent } from "@/components/ui/card";
import { Share, Shield, Zap, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">About SecureShare</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Making file sharing simple, secure, and accessible for everyone
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 leading-relaxed">
                SecureShare was created to solve the everyday problem of sharing files between devices. 
                We believe file sharing should be instant, secure, and require no complicated setup or registration. 
                Our platform enables anyone to share files instantly with just a simple 6-digit code.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 leading-relaxed">
                To become the world's most trusted and user-friendly file sharing platform. 
                We envision a world where sharing files is as simple as sharing a code, 
                without compromising on security or privacy. Every file transfer should be direct, 
                fast, and completely private.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-white rounded-2xl p-12 shadow-xl mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">What Makes Us Different</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Share className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Simple Sharing</h3>
              <p className="text-gray-600">Just a 6-digit code - no complex links or accounts needed</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Privacy</h3>
              <p className="text-gray-600">Files never stored on servers - direct device-to-device transfer</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">Instant code generation and immediate file transfers</p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                <Users className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Universal Access</h3>
              <p className="text-gray-600">Works on any device, any browser - no apps to install</p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Technology</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              SecureShare is built with cutting-edge web technologies to ensure reliability, security, and performance:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li>• <strong>WebSocket Technology:</strong> Real-time communication for instant file coordination</li>
              <li>• <strong>Client-Side Processing:</strong> Files are processed directly in your browser</li>
              <li>• <strong>Temporary Memory Storage:</strong> Files exist only during active transfers</li>
              <li>• <strong>Automatic ZIP Packaging:</strong> Multiple files bundled for convenient download</li>
              <li>• <strong>Cross-Platform Compatibility:</strong> Works seamlessly across all devices and browsers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}