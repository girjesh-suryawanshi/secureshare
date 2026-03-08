import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Share, Menu, X, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact Us" },
    { href: "/blog", label: "Blog" },
  ];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isHTTPLocal, setIsHTTPLocal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Detect iOS (where beforeinstallprompt is blocked by Apple)
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    // Detect insecure HTTP local networks (where Chrome/Android block the prompt)
    const isHTTP = window.location.protocol === 'http:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsHTTPLocal(isHTTP && !isLocalhost);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Manual Installation Required",
        description: "To install HexaSend, tap your browser's Share/Menu button and select 'Add to Home Screen'.",
        duration: 8000
      });
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const isActive = (href: string) => {
    if (href === "/" && location === "/") return true;
    if (href !== "/" && location.startsWith(href)) return true;
    return false;
  };

  // Only show the button if the browser explicitly gave us the prompt,
  // OR if we know for a fact the browser inherently blocks it (iOS / Android-LAN)
  // This prevents race-conditions where Desktop users click the button before Chrome finishes loading
  const shouldShowInstall = deferredPrompt !== null || isIOS || isHTTPLocal;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Share className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">HexaSend</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  className={isActive(item.href) ? "bg-blue-600 hover:bg-blue-700" : ""}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            {shouldShowInstall && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallClick}
                className="ml-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Install App
              </Button>
            )}
          </div>

          {/* Mobile menu and install button */}
          <div className="md:hidden flex items-center gap-2">
            {shouldShowInstall && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstallClick}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-8 px-2"
              >
                <Download className="w-4 h-4 mr-1" />
                Install
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive(item.href) ? "default" : "ghost"}
                    size="sm"
                    className={`w-full justify-start ${isActive(item.href) ? "bg-blue-600 hover:bg-blue-700" : ""
                      }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}