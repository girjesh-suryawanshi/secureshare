import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { SEOHead } from "@/components/seo-head";

export default function ReportAbuse() {
  const [transferCode, setTransferCode] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [legalBasis, setLegalBasis] = useState("copyright");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) {
      setError("Please enter a detailed description of at least 10 characters.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/report-abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transferCode: transferCode.trim() || undefined,
          reporterEmail: reporterEmail.trim() || undefined,
          legalBasis,
          description: description.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit abuse report");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Report Abuse & Legal Takedown | HexaSend"
        description="Submit a copyright, DMCA, or illegal content abuse report to HexaSend. We take swift action on safe harbour takedown notices under DMCA and IT Act Section 79."
      />
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-indigo-50 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full text-red-600 mb-4">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Report Abuse / Legal Notice</h1>
            <p className="text-gray-600 mt-2">
              HexaSend complies with DMCA and IT Act Safe Harbour regulations. Submit a notice below for immediate action.
            </p>
          </div>

          <Card className="shadow-lg border-red-100">
            <CardHeader className="bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-t-lg">
              <CardTitle className="text-xl font-semibold text-white">Abuse Notification Form</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {submitted ? (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                  <h2 className="text-2xl font-bold text-gray-800">Report Submitted</h2>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Thank you. If a valid transfer code was provided, the content transfer has been immediately flagged and removed. Our compliance team will review your report.
                  </p>
                  <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-4">
                    Submit Another Report
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="transferCode">6-Digit Transfer Code (If Known)</Label>
                    <Input
                      id="transferCode"
                      placeholder="e.g. 849201"
                      maxLength={6}
                      value={transferCode}
                      onChange={(e) => setTransferCode(e.target.value.toUpperCase())}
                      className="font-mono tracking-widest uppercase"
                    />
                    <p className="text-xs text-gray-500">
                      Providing the transfer code allows our system to immediately invalidate active temporary storage.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legalBasis">Nature of Complaint</Label>
                    <select
                      id="legalBasis"
                      value={legalBasis}
                      onChange={(e) => setLegalBasis(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="copyright">Copyright Infringement (DMCA)</option>
                      <option value="malware">Malware / Phishing / Harmful Executable</option>
                      <option value="illegal">Illegal Content / Non-Consensual Material</option>
                      <option value="other">Other Legal Violation</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reporterEmail">Your Email Address (Optional for response)</Label>
                    <Input
                      id="reporterEmail"
                      type="email"
                      placeholder="contact@yourcompany.com"
                      value={reporterEmail}
                      onChange={(e) => setReporterEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Detailed Description of Abuse *</Label>
                    <Textarea
                      id="description"
                      rows={5}
                      placeholder="Please describe the violation, copyrighted material owner details, or why this content breaches legal guidelines..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-700">Safe Harbour & Zero-Knowledge Notice:</p>
                    <p>
                      HexaSend processes transfers ephemerally without persistent server storage. Submitting false or bad-faith takedown notices may result in legal liability under DMCA 512(f).
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors"
                  >
                    {submitting ? "Submitting Notice..." : "Submit Abuse Report"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
