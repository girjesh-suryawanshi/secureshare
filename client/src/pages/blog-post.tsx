import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Share, Tag, CheckCircle } from "lucide-react";
import { Link } from "wouter";

// This would normally come from a CMS or API
const getBlogPost = (slug: string) => {
  const posts: { [key: string]: any } = {
    "how-to-share-files-securely-online-2025": {
      title: "How to Share Files Securely Online in 2025: Complete Guide",
      date: "January 15, 2025",
      readTime: "8 min read",
      category: "Security",
      tags: ["file sharing", "security", "privacy", "encryption"],
      content: `
        <h2>The Ultimate Guide to Secure File Sharing</h2>
        <p>In 2025, file sharing security is more important than ever. With increasing cyber threats and privacy concerns, choosing the right method to share files can protect your sensitive data and maintain privacy.</p>
        
        <h3>Key Security Features to Look For</h3>
        <ul>
          <li><strong>End-to-End Encryption:</strong> Files are encrypted on your device and only decrypted by the recipient</li>
          <li><strong>No Server Storage:</strong> Files transfer directly between devices without cloud storage</li>
          <li><strong>Temporary Access:</strong> Shared files expire automatically after download or time limit</li>
          <li><strong>No Registration Required:</strong> Avoid creating accounts that store personal information</li>
        </ul>
        
        <h3>Best Practices for Secure File Sharing</h3>
        <p>Follow these expert recommendations to ensure maximum security:</p>
        <ol>
          <li>Use peer-to-peer file sharing platforms like SecureShare</li>
          <li>Verify the recipient before sharing sensitive documents</li>
          <li>Use strong, unique sharing codes or passwords</li>
          <li>Enable automatic file deletion after download</li>
          <li>Avoid email attachments for confidential files</li>
        </ol>
        
        <h3>SecureShare: The Secure File Sharing Solution</h3>
        <p>SecureShare offers military-grade encryption with simple 6-digit codes. Files never touch our servers - they transfer directly between your devices for maximum privacy and security.</p>
      `
    },
    "peer-to-peer-vs-cloud-storage-comparison": {
      title: "Peer-to-Peer File Transfer vs Cloud Storage: Which is Better?",
      date: "January 12, 2025",
      readTime: "6 min read",
      category: "Technology",
      tags: ["p2p", "cloud storage", "comparison", "technology"],
      content: `
        <h2>P2P vs Cloud: The Ultimate Comparison</h2>
        <p>Understanding the differences between peer-to-peer file transfer and cloud storage helps you choose the best method for your needs.</p>
        
        <h3>Peer-to-Peer File Transfer Advantages</h3>
        <ul>
          <li><strong>Direct Transfer:</strong> Files go straight from sender to receiver</li>
          <li><strong>No Storage Limits:</strong> Transfer files of any size</li>
          <li><strong>Better Privacy:</strong> No third-party servers store your files</li>
          <li><strong>Faster Speed:</strong> Direct connection means faster transfers</li>
          <li><strong>No Subscription:</strong> Typically free to use</li>
        </ul>
        
        <h3>Cloud Storage Benefits</h3>
        <ul>
          <li><strong>Persistent Storage:</strong> Files remain accessible over time</li>
          <li><strong>Multiple Access:</strong> Download files multiple times</li>
          <li><strong>Sync Across Devices:</strong> Access from anywhere</li>
          <li><strong>Collaboration Features:</strong> Multiple users can edit files</li>
        </ul>
        
        <h3>When to Use Each Method</h3>
        <p><strong>Use P2P for:</strong> One-time transfers, large files, sensitive documents, privacy-focused sharing</p>
        <p><strong>Use Cloud for:</strong> Long-term storage, collaboration projects, regular access needs, backup purposes</p>
      `
    },
    "best-free-file-sharing-no-registration": {
      title: "Best Free File Sharing Services Without Registration in 2025",
      date: "January 10, 2025",
      readTime: "12 min read",
      category: "Reviews",
      tags: ["free", "no registration", "file sharing", "reviews"],
      content: `
        <h2>Top 10 File Sharing Platforms Without Sign-ups</h2>
        <p>In 2025, speed and privacy are the primary drivers for file sharing innovation. We've reviewed the top services that allow you to send files instantly without creating an account.</p>
        <h3>1. HexaSend</h3>
        <p>HexaSend leads the pack with its unique 6-digit code system and pure P2P architecture. By eliminating server storage entirely, it offers unmatched privacy.</p>
        <h3>Why Skip Registration?</h3>
        <ul>
          <li>Save time by skipping onboarding flows</li>
          <li>Protect your email address from marketing lists</li>
          <li>Reduce your digital footprint</li>
        </ul>
      `
    },
    "send-large-files-instantly-methods": {
      title: "How to Send Large Files Instantly: 5 Fast Methods",
      date: "January 8, 2025",
      readTime: "7 min read",
      category: "Tips",
      tags: ["large files", "instant", "transfer", "tips"],
      content: `
        <h2>Mastering Large File Transfers</h2>
        <p>Email attachments often cap out at 25MB, which is insufficient for high-resolution videos or large datasets. Here are the best ways to bypass those limits.</p>
        <h3>Top Methods</h3>
        <ul>
          <li><strong>Direct P2P:</strong> The fastest way to move data between two active devices.</li>
          <li><strong>Chunked Uploads:</strong> Splitting files into smaller parts to handle network interruptions.</li>
          <li><strong>Local Network Transfer:</strong> Using your Wi-Fi's full bandwidth for near-instant transfers between nearby devices.</li>
        </ul>
      `
    },
    "6-digit-code-file-sharing-future": {
      title: "6-Digit Code File Sharing: The Future of Simple Transfer",
      date: "January 5, 2025",
      readTime: "5 min read",
      category: "Innovation",
      tags: ["6-digit code", "innovation", "simple", "future"],
      content: `
        <h2>The Power of the 6-Digit Code</h2>
        <p>Complex URLs and QR codes are useful, but nothing beats the simplicity of a 6-digit alphanumeric code. It's easy to read over the phone, text, or remember long enough to type into another device.</p>
        <h3>Security of Codes</h3>
        <p>While 6 digits might seem short, with alphanumeric characters, there are over 2 billion possible combinations. Combined with short expiry times, these codes are incredibly secure for temporary transfers.</p>
      `
    },
    "share-files-iphone-android-cross-platform": {
      title: "Share Files Between iPhone and Android: Cross-Platform Guide",
      date: "January 3, 2025",
      readTime: "9 min read",
      category: "Mobile",
      tags: ["iphone", "android", "cross-platform", "mobile"],
      content: `
        <h2>Bridging the Mobile Gap</h2>
        <p>Transferring files between iOS and Android used to be a headache. AirDrop only works with Apple devices, and Nearby Share is mostly for Android. Web-based P2P tools have changed the game.</p>
        <h3>How to do it:</h3>
        <ol>
          <li>Open HexaSend in both device browsers.</li>
          <li>Upload the file on the source device.</li>
          <li>Enter the code on the target device.</li>
        </ol>
      `
    }
  };
  
  return posts[slug] || null;
};

export default function BlogPost() {
  const [match, params] = useRoute("/blog/:slug");
  
  if (!match || !params?.slug) {
    return <div>Post not found</div>;
  }
  
  const post = getBlogPost(params.slug);
  
  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
            <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been moved.</p>
            <Link href="/blog">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Blog
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* Back to Blog */}
        <Link href="/blog">
          <Button variant="ghost" className="mb-8 hover:bg-white/80">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Button>
        </Link>

        {/* Article Header */}
        <Card className="mb-8 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {post.category}
              </span>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{post.date}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
              {post.title}
            </h1>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag: string) => (
                <span key={tag} className="flex items-center space-x-1 text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                  <Tag className="h-3 w-3" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Expert-reviewed content</span>
              </div>
              <Button variant="outline" size="sm">
                <Share className="h-4 w-4 mr-2" />
                Share Article
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Article Content */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            <div 
              className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            
            {/* Call to Action */}
            <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Ready to Share Files Securely?</h3>
              <p className="text-gray-600 mb-4">
                Try HexaSend now - the fastest and most secure way to share files with just a 6-digit code.
              </p>
              <Link href="/">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg">
                  Start Sharing Files
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Related Articles */}
        <Card className="mt-8 border-0 bg-white/80 backdrop-blur-sm shadow-xl">
          <CardContent className="p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <Link href="/blog/best-free-file-sharing-no-registration">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                  <h4 className="font-semibold text-gray-900 mb-2">Best Free File Sharing Services Without Registration</h4>
                  <p className="text-sm text-gray-600">Top platforms that don't require sign-ups for instant file sharing.</p>
                </div>
              </Link>
              <Link href="/blog/6-digit-code-file-sharing-future">
                <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                  <h4 className="font-semibold text-gray-900 mb-2">6-Digit Code File Sharing: The Future of Simple Transfer</h4>
                  <p className="text-sm text-gray-600">Why alphanumeric codes are revolutionizing file sharing.</p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
