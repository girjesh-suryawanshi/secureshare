import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, Calendar, Clock, ArrowRight, FileText, Share, Shield, Zap, Globe, Users, Archive, BookOpen } from "lucide-react";
import { useState } from "react";
import { SEOHead } from "@/components/seo-head";

// Blog posts data with SEO-optimized titles and trending keywords
export const blogPosts = [
  {
    id: 401,
    title: "How to transfer files from PC to Mobile without USB",
    excerpt: "Skip cables and dongles. Learn simple ways to move files from your computer to your phone using WiFi, codes, and browser-based tools.",
    category: "Guide",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "how-to-transfer-files-from-pc-to-mobile-without-usb",
    tags: ["PC to mobile", "no USB", "WiFi transfer", "file transfer"],
    icon: Zap
  },
  {
    id: 402,
    title: "Share large files online without registration",
    excerpt: "Send big files without creating accounts. Compare the best no-signup options for sharing large videos, folders, and documents.",
    category: "Guide",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "share-large-files-online-without-registration",
    tags: ["large files", "no registration", "online sharing", "no signup"],
    icon: Globe
  },
  {
    id: 403,
    title: "Fastest way to send files between two laptops on the same WiFi",
    excerpt: "Get the quickest method to transfer files between two laptops on the same network. No cloud uploads, no accounts—just direct transfer.",
    category: "Tips",
    readTime: "5 min read",
    date: "February 1, 2026",
    slug: "fastest-way-to-send-files-between-two-laptops-on-same-wifi",
    tags: ["same WiFi", "laptop to laptop", "fast transfer", "local network"],
    icon: Zap
  },
  {
    id: 404,
    title: "Secure file sharing with 6 digit code",
    excerpt: "Why 6-digit codes are a simple and secure way to share files. How they work, why they're safe, and the best tools that use them.",
    category: "Security",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "secure-file-sharing-with-6-digit-code",
    tags: ["6 digit code", "secure sharing", "file transfer", "privacy"],
    icon: Shield
  },
  {
    id: 405,
    title: "Send files anonymously without email",
    excerpt: "Share files without revealing your email or identity. Methods and tools for anonymous, one-off file transfers.",
    category: "Privacy",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "send-files-anonymously-without-email",
    tags: ["anonymous", "no email", "privacy", "file sharing"],
    icon: Shield
  },
  {
    id: 406,
    title: "Transfer large files between Android and iPhone instantly",
    excerpt: "Bridge the Android–iPhone gap. Practical ways to move large files between the two platforms without cables or complicated setup.",
    category: "Mobile",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "transfer-large-files-between-android-and-iphone-instantly",
    tags: ["Android", "iPhone", "cross-platform", "large files"],
    icon: Globe
  },
  {
    id: 407,
    title: "Best WeTransfer alternatives for small files",
    excerpt: "WeTransfer isn't always the best fit. Top alternatives for sending small files quickly, with no signup and better privacy.",
    category: "Reviews",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "best-wetransfer-alternatives-for-small-files",
    tags: ["WeTransfer", "alternatives", "small files", "no signup"],
    icon: FileText
  },
  {
    id: 408,
    title: "How to send files to another computer using a code",
    excerpt: "Step-by-step guide to sending files to any computer using only a short code—no accounts, no links, no complexity.",
    category: "Guide",
    readTime: "5 min read",
    date: "February 1, 2026",
    slug: "how-to-send-files-to-another-computer-using-a-code",
    tags: ["code", "computer", "file send", "simple"],
    icon: Share
  },
  {
    id: 409,
    title: "Temporary file sharing for one-time use",
    excerpt: "Share files that aren't stored forever. How temporary and one-time file sharing works and why it's better for privacy.",
    category: "Privacy",
    readTime: "6 min read",
    date: "February 1, 2026",
    slug: "temporary-file-sharing-for-one-time-use",
    tags: ["temporary", "one-time", "privacy", "ephemeral"],
    icon: Shield
  },
  {
    id: 410,
    title: "Browser-to-browser file transfer no setup",
    excerpt: "Send files from one browser to another with zero installation. How web-based transfer works and the best tools to use.",
    category: "Technology",
    readTime: "5 min read",
    date: "February 1, 2026",
    slug: "browser-to-browser-file-transfer-no-setup",
    tags: ["browser", "no setup", "web transfer", "instant"],
    icon: Globe
  },
  {
    id: 300,
    title: "Share Files Without Signup: The Easiest Way to Send Files Instantly",
    excerpt: "Tired of account requirements? Learn how to share files instantly without signup for faster, frictionless transfers.",
    category: "Guide",
    readTime: "5 min read",
    date: "January 2, 2026",
    slug: "share-files-without-signup-instant-send",
    tags: ["no signup", "instant", "file sharing", "frictionless"],
    icon: Zap
  },
  {
    id: 200,
    title: "Send Files Using a 6 Digit Code: A Simple, Secure Way to Share Files Without Login",
    excerpt: "Tired of slow uploads and complicated sharing? Learn how to send files using a 6-digit code instantly without any accounts or logins.",
    category: "Guide",
    readTime: "8 min read",
    date: "January 2, 2026",
    slug: "send-files-using-6-digit-code-secure-way",
    tags: ["6-digit code", "secure sharing", "no login", "file transfer"],
    icon: Shield
  },
  {
    id: 101,
    title: "The Ultimate Guide to P2P File Sharing in 2026",
    excerpt: "Master peer-to-peer technology in 2026. Learn how P2P platforms like HexaSend are making file transfers faster and more secure.",
    category: "Guide",
    readTime: "10 min read",
    date: "January 2, 2026",
    slug: "ultimate-guide-to-p2p-file-sharing-2026",
    tags: ["p2p", "file sharing", "2026", "guide"],
    icon: FileText
  },
  {
    id: 102,
    title: "Top 5 File Sharing Security Trends for 2026",
    excerpt: "Cybersecurity is evolving. Explore the latest trends in secure file sharing, from quantum-resistant encryption to zero-knowledge architecture.",
    category: "Security",
    readTime: "7 min read",
    date: "January 5, 2026",
    slug: "security-trends-file-sharing-2026",
    tags: ["security", "trends", "2026", "privacy"],
    icon: Shield
  },
  {
    id: 103,
    title: "Fastest Ways to Transfer Large Files in 2026",
    excerpt: "Speed up your workflow. Discover next-gen transfer technologies that move multi-gigabyte files at lightning speed in 2026.",
    category: "Speed",
    readTime: "6 min read",
    date: "January 8, 2026",
    slug: "fastest-ways-to-transfer-large-files-2026",
    tags: ["speed", "large files", "2026", "tech"],
    icon: Zap
  },
  {
    id: 104,
    title: "Best Free File Transfer Services (No Registration) 2026",
    excerpt: "Test results are in. See why HexaSend is our #1 choice for free, no-registration file sharing in 2026.",
    category: "Reviews",
    readTime: "12 min read",
    date: "January 12, 2026",
    slug: "best-free-file-transfer-no-registration-2026",
    tags: ["free", "no registration", "2026", "reviews"],
    icon: Globe
  },
  {
    id: 1,
    title: "How to Share Files Securely Online in 2026: Complete Guide",
    excerpt: "Discover the safest methods to share files online with end-to-end encryption, no registration required, and complete privacy protection.",
    category: "Security",
    readTime: "8 min read",
    date: "January 15, 2026",
    slug: "how-to-share-files-securely-online-2025",
    tags: ["file sharing", "security", "privacy", "encryption"],
    icon: Shield
  },
  {
    id: 2,
    title: "Peer-to-Peer File Transfer vs Cloud Storage: Which is Better?",
    excerpt: "Compare P2P file sharing with cloud storage solutions. Learn why direct transfers offer better privacy, speed, and control.",
    category: "Technology",
    readTime: "6 min read",
    date: "January 12, 2026",
    slug: "peer-to-peer-vs-cloud-storage-comparison",
    tags: ["p2p", "cloud storage", "comparison", "technology"],
    icon: Globe
  },
  {
    id: 3,
    title: "Best Free File Sharing Services Without Registration in 2026",
    excerpt: "Top file sharing platforms that don't require sign-ups. Send files instantly with simple codes and direct peer-to-peer links.",
    category: "Reviews",
    readTime: "12 min read",
    date: "January 10, 2026",
    slug: "best-free-file-sharing-no-registration",
    tags: ["free", "no registration", "file sharing", "reviews"],
    icon: FileText
  },
  {
    id: 4,
    title: "How to Send Large Files Instantly: 5 Fast Methods",
    excerpt: "Send files of any size without email limitations. Learn about file compression, peer-to-peer transfer, and instant sharing.",
    category: "Tips",
    readTime: "7 min read",
    date: "January 8, 2026",
    slug: "send-large-files-instantly-methods",
    tags: ["large files", "instant", "transfer", "tips"],
    icon: Zap
  },
  {
    id: 5,
    title: "6-Digit Code File Sharing: The Future of Simple Transfer",
    excerpt: "Why alphanumeric codes are revolutionizing file sharing. Easy to remember, impossible to guess, and universally compatible.",
    category: "Innovation",
    readTime: "5 min read",
    date: "January 5, 2026",
    slug: "6-digit-code-file-sharing-future",
    tags: ["6-digit code", "innovation", "simple", "future"],
    icon: Share
  }
];

const categories = ["All", "Security", "Technology", "Tips", "Business", "Mobile", "Privacy", "Guide", "Speed", "Reviews", "Innovation", "Tutorials", "Professional", "Personal", "Alternatives", "Remote Work", "Future"];

export default function Blog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <SEOHead
        title="The HexaSend File Sharing Blog | Tips, Security, & News"
        description="Explore the latest in peer-to-peer file transfer technology. Read our guides on securely sharing large files online, transferring across mobile environments, and beating email attachment limits."
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-12">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              File Sharing Blog 2026
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Expert guides, trends, and security insights for 2026. Master the latest in peer-to-peer
              transfer and digital privacy technology.
            </p>

            {/* Search and Filter */}
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search 2026 articles, guides, and trends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-white text-gray-600 hover:bg-blue-50 border border-gray-200"
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Blog Posts Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => {
              const IconComponent = post.icon;
              return (
                <Card key={post.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {post.category}
                      </span>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h2>

                    <p className="text-gray-600 mb-4 leading-relaxed">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-4">
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

                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <Link href={`/blog/${post.slug}`}>
                      <button className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:shadow-lg transition-all group-hover:scale-105">
                        <span>Read Article</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* No Results */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">No articles found</h3>
              <p className="text-gray-500">Try adjusting your search terms or category filter.</p>
            </div>
          )}

          {/* SEO Content Section */}
          <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Expert File Sharing Knowledge 2026</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Security & Privacy</h3>
                <p className="text-gray-600">
                  Deep dive into quantum-resistant encryption and anonymous sharing techniques for the modern age.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Speed & Performance</h3>
                <p className="text-gray-600">
                  Explore the limits of WebRTC and local network transfers for near-instant data exchange.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Innovation & Trends</h3>
                <p className="text-gray-600">
                  Stay ahead of the curve with insights into global mesh networks and the evolution of P2P.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
