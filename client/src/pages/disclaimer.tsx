import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Shield, Info } from "lucide-react";

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-orange-100 rounded-full mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Disclaimer</h1>
          <p className="text-lg text-gray-600">
            Important information about using HexaSend
          </p>
        </div>

        <div className="space-y-8">
          <Card className="shadow-xl border-l-4 border-l-orange-500">
            <CardContent className="p-8">
              <div className="flex items-start space-x-4">
                <Info className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">General Disclaimer</h2>
                  <p className="text-gray-600 leading-relaxed">
                    The information and services provided by HexaSend are offered on an "as is" basis. 
                    While we strive to provide a reliable and secure file sharing service, we make no warranties 
                    or representations about the completeness, accuracy, reliability, or suitability of our service 
                    for any particular purpose.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Availability</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                HexaSend is provided as a web-based service subject to the following limitations:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Service may be temporarily unavailable due to maintenance, updates, or technical issues</li>
                <li>• We do not guarantee 100% uptime or continuous availability</li>
                <li>• Server capacity and performance may vary based on usage and demand</li>
                <li>• Internet connectivity issues may affect service functionality</li>
                <li>• Browser compatibility may limit certain features on older browsers</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">File Transfer Limitations</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                When using HexaSend for file transfers, please be aware of these limitations:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• File size limits depend on browser capabilities and available device memory</li>
                <li>• Transfer success depends on stable internet connections for both sender and receiver</li>
                <li>• Files are temporarily stored in server memory and automatically deleted after 1 hour</li>
                <li>• Large files may take considerable time to process and transfer</li>
                <li>• Network interruptions may cause transfer failures</li>
                <li>• Some file types may be restricted by browser security policies</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-xl border-l-4 border-l-red-500">
            <CardContent className="p-8">
              <div className="flex items-start space-x-4">
                <Shield className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Security Considerations</h2>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    While SecureShare implements security measures, users should understand these important points:
                  </p>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Transfer codes should only be shared with intended recipients</li>
                    <li>• We cannot guarantee the security of files during browser processing</li>
                    <li>• Users are responsible for ensuring they have the right to share their files</li>
                    <li>• Sensitive or confidential files should be encrypted before sharing</li>
                    <li>• Public or shared computers may pose security risks</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">User Responsibility</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                By using SecureShare, users acknowledge and accept responsibility for:
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Verifying the appropriateness and legality of files being shared</li>
                <li>• Understanding and accepting the risks associated with file sharing</li>
                <li>• Ensuring compliance with all applicable laws and regulations</li>
                <li>• Maintaining appropriate backups of important files</li>
                <li>• Using the service in accordance with our Terms and Conditions</li>
                <li>• Protecting transfer codes from unauthorized access</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Dependencies</h2>
              <p className="text-gray-600 leading-relaxed">
                SecureShare relies on various third-party services and technologies, including web browsers, 
                internet service providers, and hosting infrastructure. We cannot control or guarantee the 
                performance, availability, or security of these third-party components, and we disclaim 
                any liability arising from their use or failure.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Loss and Recovery</h2>
              <p className="text-gray-600 leading-relaxed">
                SecureShare operates on a temporary storage model where files are automatically deleted after transfer completion or expiration. 
                We cannot recover files once they have been deleted from our systems. Users are strongly advised to maintain 
                their own copies of important files and understand that file recovery is not possible once transfers are complete.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Legal Compliance</h2>
              <p className="text-gray-600 leading-relaxed">
                Users are solely responsible for ensuring their use of SecureShare complies with all applicable laws, 
                regulations, and third-party rights. This includes but is not limited to copyright laws, 
                privacy regulations, export controls, and data protection requirements. We disclaim any responsibility 
                for users' legal compliance and reserve the right to terminate service for violations.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl bg-blue-50 border border-blue-200">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Questions and Support</h2>
              <p className="text-gray-600 leading-relaxed">
                If you have questions about this disclaimer or need support with SecureShare, please contact us at 
                support@secureshare.com. We will make reasonable efforts to assist you, but cannot guarantee 
                specific response times or resolution of all issues.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}