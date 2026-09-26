import { Link } from "wouter";
import { Share2, Shield, FileText, AlertTriangle, Users, Mail, Flag, Upload, Download, MessageSquare, BookOpen, Youtube, Twitter, Linkedin, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    toast({ title: "Subscribed!", description: "Thank you for subscribing to HexaSend updates." });
    setEmail("");
  };

  return (
    <footer className="bg-[#0b0f19] text-slate-400 border-t border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-md">
                <Share2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">HexaSend</span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-400 mb-5">
              Simple, secure, and lightning-fast file sharing between devices. No accounts required.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-indigo-600 transition-colors">
                <Youtube className="h-4 w-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-indigo-600 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-indigo-600 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Product */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Product</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Send Files</Link></li>
              <li><Link href="/" className="hover:text-white transition-colors">Receive Files</Link></li>
              <li><Link href="/chat" className="hover:text-white transition-colors">Instant Chat</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Install App</Link></li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Company</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/report-abuse" className="hover:text-white transition-colors">Report Abuse</Link></li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Legal</h3>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/disclaimer" className="hover:text-white transition-colors">Disclaimer</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Column 5: Stay Updated */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Stay Updated</h3>
            <p className="text-xs text-slate-400 mb-3">Get the latest updates and tips.</p>
            <form onSubmit={handleSubscribe} className="flex items-center gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700 focus-within:border-indigo-500">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none px-2.5 w-full"
              />
              <button type="submit" className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shrink-0">
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800/80 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {currentYear} HexaSend. All rights reserved.</p>
          <p>Made with ❤️ for secure file sharing</p>
        </div>
      </div>
    </footer>
  );
}