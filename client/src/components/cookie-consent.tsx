import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("hexasend-cookie-consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("hexasend-cookie-consent", "accepted");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-200 p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom duration-500">
      <div className="flex-1 text-sm text-gray-600 max-w-4xl">
        <h3 className="font-semibold text-gray-900 mb-1">We value your privacy</h3>
        <p>
          We use cookies to enhance your browsing experience, serve personalized ads or content, and analyze our traffic. By clicking "Accept", you consent to our use of cookies as described in our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
        </p>
      </div>
      <div className="flex gap-3 flex-shrink-0">
        <Button onClick={acceptCookies} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
          Accept
        </Button>
      </div>
    </div>
  );
}
