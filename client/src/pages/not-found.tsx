import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { SEOHead } from "@/components/seo-head";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SEOHead
        title="404 - Page Not Found | HexaSend"
        description="The page you are looking for does not exist."
        noindex={true}
      />
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="inline-flex p-3 bg-red-100 rounded-full text-red-600 mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">404 Page Not Found</h1>
            <p className="mb-6 text-sm text-gray-600">
              The page you are looking for does not exist, has been moved, or has expired.
            </p>
            <Link href="/">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
