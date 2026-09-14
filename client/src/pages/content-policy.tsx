import { Card, CardContent } from "@/components/ui/card";
import { SEOHead } from "@/components/seo-head";
import { Shield, Eye, FileCheck, AlertTriangle, Users, Globe, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ContentPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Content & AdSense Safety Policy — HexaSend"
        description="HexaSend file transfer and room chat content guidelines, allowed file formats, abuse prevention mechanisms, and Google AdSense compliance policies."
        keywords="HexaSend content policy, AdSense safety, file sharing rules, DMCA compliance, safe file formats"
      />

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2">
            <Shield className="h-10 w-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Content & Safety Policy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            HexaSend is dedicated to providing a secure, zero-knowledge peer-to-peer file transfer and temporary room workspace that strictly enforces Google AdSense and global internet safety standards.
          </p>
        </div>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <section className="space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                <FileCheck className="h-5 w-5" />
                <h2>1. Permitted & Whitelisted File Types</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                To prevent tool abuse and protect our network from malicious software, HexaSend restricts file uploads exclusively to standard productivity documents, media, and safe compressed archives:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <div>• Documents: PDF, DOCX, XLSX, PPTX, TXT, CSV, RTF</div>
                <div>• Images: JPG, PNG, GIF, WEBP, SVG, BMP</div>
                <div>• Archives: ZIP, RAR, 7Z, TAR, GZ</div>
                <div>• Audio / Video: MP3, WAV, MP4, WEBM</div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 font-bold text-lg">
                <AlertTriangle className="h-5 w-5" />
                <h2>2. Strictly Prohibited Content & Executables</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                HexaSend automatically blocks dangerous executable formats (`.exe`, `.bat`, `.apk`, `.vbs`, `.sh`, `.msi`). Furthermore, transmitting any of the following content is strictly prohibited under our <Link href="/terms"><span className="text-indigo-600 dark:text-indigo-400 underline cursor-pointer">Terms of Service</span></Link>:
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 dark:text-slate-400 space-y-1 pl-2">
                <li>Malware, viruses, trojans, ransomware, or phishing payloads.</li>
                <li>Copyright-infringing software, cracked media, or unauthorized commercial material.</li>
                <li>Sexually explicit, non-consensual, or unlawful content.</li>
                <li>Hate speech, harassment, or terrorist organization propaganda.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                <Eye className="h-5 w-5" />
                <h2>3. Security Auditing & Privacy Safeguards</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We maintain an automated security audit logging system that records basic metadata (SHA-256 anonymized IP hash, timestamp, file size, and extension) to flag high-volume abuse patterns without storing user personal details or file contents.
              </p>
            </section>

            <section className="space-y-3">
              <div className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 font-bold text-lg">
                <Users className="h-5 w-5" />
                <h2>4. Abuse Reporting & DMCA Compliance</h2>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We respond promptly to valid DMCA takedown notices and law enforcement requests. If you discover prohibited material being shared, please submit a notice via our dedicated <Link href="/report-abuse"><span className="text-indigo-600 dark:text-indigo-400 underline cursor-pointer">Report Abuse / DMCA Page</span></Link>.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
