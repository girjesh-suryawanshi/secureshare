import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Share2, Menu, X, Download, ChevronDown, Shield, FileText, AlertTriangle, Flag, Users, Mail, Upload, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const moreItems = [
    { href: "/about", label: "About Us", icon: Users },
    { href: "/contact", label: "Contact Us", icon: Mail },
    { href: "/privacy", label: "Privacy Policy", icon: Shield },
    { href: "/terms", label: "Terms & Conditions", icon: FileText },
    { href: "/disclaimer", label: "Disclaimer", icon: AlertTriangle },
    { href: "/report-abuse", label: "Report Abuse", icon: Flag },
  ];

  const primaryNavItems = [
    { href: "/", label: "Send", icon: Upload },
    { href: "/", label: "Receive", icon: Download },
    { href: "/chat", label: "Instant Chat", icon: MessageSquare },
    { href: "/blog", label: "Blog", icon: null },
  ];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isHTTPLocal, setIsHTTPLocal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);

    const isHTTP = window.location.protocol === 'http:';
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setIsHTTPLocal(isHTTP && !isLocalhost);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
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
    deferredPrompt.prompt();
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

  const isMoreActive = moreItems.some(item => isActive(item.href));
  const shouldShowInstall = deferredPrompt !== null || isIOS || isHTTPLocal;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer shrink-0">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Share2 className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">HexaSend</span>
            </div>
          </Link>

          {/* Desktop Navigation — center */}
          <div className="hidden md:flex items-center gap-1">
            <Link href="/">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location === "/"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Send
              </button>
            </Link>
            <Link href="/">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                onClick={() => {
                  // Scroll to receive section on homepage
                  setTimeout(() => {
                    const el = document.getElementById('receive-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
              >
                Receive
              </button>
            </Link>
            <Link href="/chat">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.startsWith("/chat") || location.startsWith("/room")
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Instant Chat
              </button>
            </Link>
            <Link href="/blog">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  location.startsWith("/blog")
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                Blog
              </button>
            </Link>

            {/* More Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isMoreActive
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  More
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl bg-white border border-slate-200 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                  Company
                </DropdownMenuLabel>
                {moreItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href + item.label} asChild className="cursor-pointer rounded-lg px-2.5 py-2 hover:bg-indigo-50 focus:bg-indigo-50">
                      <Link href={item.href} className="flex items-center gap-2.5 w-full text-sm font-medium text-slate-700">
                        <Icon className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1">
                  Legal & Policies
                </DropdownMenuLabel>
                {moreItems.slice(2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.href + item.label} asChild className="cursor-pointer rounded-lg px-2.5 py-2 hover:bg-indigo-50 focus:bg-indigo-50">
                      <Link href={item.href} className="flex items-center gap-2.5 w-full text-sm font-medium text-slate-700">
                        <Icon className="h-4 w-4 text-indigo-500 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right side: Install App */}
          <div className="hidden md:flex items-center">
            <Button
              onClick={handleInstallClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium h-8 px-4 rounded-lg flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </Button>
          </div>

          {/* Mobile: Install + Hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-3 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 py-3">
            <div className="flex flex-col gap-1">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location === "/" ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:bg-slate-50"}`}>
                  Send Files
                </button>
              </Link>
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  Receive Files
                </button>
              </Link>
              <Link href="/chat" onClick={() => setIsMobileMenuOpen(false)}>
                <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.startsWith("/chat") ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:bg-slate-50"}`}>
                  Instant Chat
                </button>
              </Link>
              <Link href="/blog" onClick={() => setIsMobileMenuOpen(false)}>
                <button className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.startsWith("/blog") ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:bg-slate-50"}`}>
                  Blog
                </button>
              </Link>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Company</p>
                {moreItems.slice(0, 2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href + item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <button className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:bg-slate-50"}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
                <p className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Legal</p>
                {moreItems.slice(2).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href + item.label} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                      <button className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.href) ? "text-indigo-600 bg-indigo-50" : "text-slate-600 hover:bg-slate-50"}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}