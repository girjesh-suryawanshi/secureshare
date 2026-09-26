import { Card, CardContent } from "@/components/ui/card";
import { Share, Shield, Zap, Users, Globe, Award, Clock, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";

export default function About() {
  return (
    <>
      <SEOHead
        title="About HexaSend | Secure Instant File Sharing Platform"
        description="Learn the story behind HexaSend — our mission, our team, and why we built the world's simplest secure file sharing platform. Share files instantly using a 6-digit code with no registration needed."
        keywords="about hexasend, HexaSend mission, file transfer technology, secure file sharing, P2P file transfer team"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto py-12">

          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">About HexaSend — The Secure File Sharing Platform Built for Everyone</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We built HexaSend because sharing a file should never require creating an account, installing an app, or trusting a third-party cloud service with your personal data.
              Our platform enables instant, secure peer-to-peer file transfers between any two devices using a simple 6-digit code.
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { label: "Files Transferred", value: "500K+", icon: Share },
              { label: "Countries Reached", value: "80+", icon: Globe },
              { label: "Uptime Guarantee", value: "99.9%", icon: Award },
              { label: "Response Time", value: "< 24hrs", icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-xl p-4 text-center shadow-md">
                <Icon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Mission & Vision */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  HexaSend was founded with a single goal: to make file sharing as effortless as passing a note.
                  We believe the act of sending a document, photo, or video to another person should not require a Google account, a Dropbox subscription, or a complicated app install. It should just work — instantly, securely, and privately.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Our platform is built on the principle that privacy is not a premium feature — it is a fundamental right. Every file transfer on HexaSend is temporary, meaning your files are never permanently stored on our servers. Internet transfers are retained for a maximum of 24 hours purely to facilitate delivery, then permanently deleted.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We envision a world where the digital divide is erased — where a teacher in a rural school can share lesson materials with students, where a small business owner can send a proposal to a client, and where a family can share vacation photos, all without needing a tech degree or a paid subscription.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  By 2026, we aim to be the most trusted browser-based file transfer tool for individuals and teams across 100+ countries, recognized for our commitment to speed, security, and radical simplicity.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Our Story */}
          <Card className="shadow-lg mb-12">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Story — Why We Built HexaSend</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                HexaSend started in 2025 when our founding team — a group of software engineers with over 15 years of combined experience in web security and distributed systems — grew frustrated with existing file transfer tools. Every option was either too slow (email), too expensive (cloud subscriptions), or required too much trust (uploading to unknown third-party servers).
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                We spent months researching WebSocket and WebRTC technology to build a peer-to-peer transfer engine that operates directly in the browser. No plugins, no Java, no Flash — just the modern web standards that are already built into every smartphone and computer on the planet.
              </p>
              <p className="text-gray-600 leading-relaxed">
                The result is HexaSend: a platform where you drag your file in, share a 6-digit code, and the person on the other end downloads it directly. Clean, fast, and private. We launched our public beta in early 2025 and have been growing steadily ever since, driven entirely by word-of-mouth from users who appreciate the simplicity.
              </p>
            </CardContent>
          </Card>

          {/* Technology */}
          <div className="bg-white rounded-2xl p-10 shadow-xl mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">The Technology Behind HexaSend</h2>
            <p className="text-gray-600 leading-relaxed mb-6 text-center max-w-2xl mx-auto">
              We use modern, open web standards so that our platform works on any browser — Chrome, Firefox, Safari, or Edge — on any device, with no installation required.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: "WebSocket Real-Time Signaling", desc: "Our server acts as a matchmaker, connecting two devices using an ultra-low-latency WebSocket channel. Once connected, files can flow directly between devices." },
                { title: "Secure TLS Encryption", desc: "All data transmitted through our platform is protected by industry-standard TLS (Transport Layer Security) encryption. Your files are unreadable to any third party during transfer." },
                { title: "Client-Side File Processing", desc: "File chunking, ZIP packaging, and progress tracking all happen directly in your browser using native Web APIs. We never touch your file content on the server." },
                { title: "Automatic File Expiry", desc: "Every file registered on HexaSend is given a hard expiry of 24 hours. Our automated cleanup system permanently deletes all temporary files after this window." },
                { title: "Cross-Platform by Design", desc: "We test HexaSend on Windows, macOS, Linux, Android, and iOS. Our responsive interface works seamlessly from a 27-inch monitor down to a 4-inch smartphone screen." },
                { title: "No Account, No Tracking", desc: "We do not require you to create an account. We do not sell your data to advertisers. We store only the minimum technical data necessary to complete your file transfer." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What Makes Us Different */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: Share, color: "bg-blue-100 text-blue-600", title: "Simple 6-Digit Codes", desc: "No complex links or QR codes needed. A memorable 6-character code connects sender to receiver." },
              { icon: Shield, color: "bg-green-100 text-green-600", title: "Privacy by Default", desc: "No permanent storage. No account required. Your files exist only long enough to be delivered." },
              { icon: Zap, color: "bg-purple-100 text-purple-600", title: "Instant Transfers", desc: "Files start transferring the moment the receiver enters the code — no waiting, no queuing." },
              { icon: Users, color: "bg-orange-100 text-orange-600", title: "Works for Everyone", desc: "Designed for all skill levels. If you can type 6 characters, you can use HexaSend." },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 text-center shadow-md">
                <div className={`inline-flex items-center justify-center w-14 h-14 ${color} rounded-full mb-4`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Ready to Experience Effortless File Sharing?</h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              No signup. No app. No limits. Just drag, drop, and share with a 6-digit code. Join hundreds of thousands of users who trust HexaSend every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <button className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors">
                  Start Sharing Now
                </button>
              </Link>
              <Link href="/contact">
                <button className="border border-white text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/10 transition-colors">
                  Contact Our Team
                </button>
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}