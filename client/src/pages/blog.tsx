import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Search, Calendar, Clock, ArrowRight, FileText, Share, Shield, Zap, Globe, Users, Archive, Guide } from "lucide-react";
import { useState } from "react";

// Blog posts data with SEO-optimized titles and trending keywords
const blogPosts = [
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
    id: 105,
    title: "How to Share Confidential Documents Securely in 2026",
    excerpt: "Protect your sensitive data. Learn the best practices for sharing legal and financial documents using modern secure infrastructure.",
    category: "Security",
    readTime: "9 min read",
    date: "January 15, 2026",
    slug: "how-to-share-confidential-documents-2026",
    tags: ["confidential", "security", "documents", "2026"],
    icon: Shield
  },
  {
    id: 106,
    title: "P2P vs Email: Why You Should Stop Using Attachments in 2026",
    excerpt: "The death of the email attachment. Discover why P2P is the superior choice for size, security, and organization in 2026.",
    category: "Technology",
    readTime: "5 min read",
    date: "January 18, 2026",
    slug: "p2p-vs-email-sharing-comparison-2026",
    tags: ["p2p", "email", "2026", "transfer"],
    icon: Zap
  },
  {
    id: 107,
    title: "Ultimate Cross-Platform File Sharing Guide for 2026",
    excerpt: "Work seamlessly across all your devices. Universal guide for moving files between Mac, PC, iPhone, and Android in 2026.",
    category: "Guide",
    readTime: "8 min read",
    date: "January 22, 2026",
    slug: "cross-platform-file-sharing-guide-2026",
    tags: ["cross-platform", "guide", "2026", "mobile"],
    icon: Globe
  },
  {
    id: 108,
    title: "The Hidden Benefits of Browser-Based File Sharing in 2026",
    excerpt: "No apps, no hassle. Learn why the web browser has become the most powerful tool for file exchange in 2026.",
    category: "Technology",
    readTime: "7 min read",
    date: "January 25, 2026",
    slug: "browser-based-file-sharing-benefits-2026",
    tags: ["browser", "web-based", "2026", "benefits"],
    icon: Globe
  },
  {
    id: 109,
    title: "Anonymous File Sharing: Maintaining Privacy in 2026",
    excerpt: "Your identity, your choice. Understand the importance of anonymous sharing as a fundamental right in 2026.",
    category: "Privacy",
    readTime: "6 min read",
    date: "January 28, 2026",
    slug: "anonymous-file-sharing-privacy-2026",
    tags: ["anonymous", "privacy", "2026", "security"],
    icon: Shield
  },
  {
    id: 110,
    title: "The Future of Digital File Exchange: 2026 and Beyond",
    excerpt: "What lies ahead? Explore global trends like mesh networks and AI-assisted transfers in the future of file sharing.",
    category: "Innovation",
    readTime: "11 min read",
    date: "January 31, 2026",
    slug: "future-of-digital-file-exchange-2026-beyond",
    tags: ["future", "innovation", "2026", "trends"],
    icon: Zap
  },
  {
    id: 3,
    title: "Best Free File Sharing Services Without Registration in 2025",
    excerpt: "Top 10 file sharing platforms that don't require sign-ups. Send files instantly with simple codes and links.",
    category: "Reviews",
    readTime: "12 min read",
    date: "January 10, 2025",
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
    date: "January 8, 2025",
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
    date: "January 5, 2025",
    slug: "6-digit-code-file-sharing-future",
    tags: ["6-digit code", "innovation", "simple", "future"],
    icon: Share
  },
  {
    id: 7,
    title: "ZIP File Sharing Made Easy: Compress and Send Multiple Files",
    excerpt: "Learn how to automatically package multiple files into ZIP format for convenient sharing and downloading.",
    category: "Tutorials",
    readTime: "6 min read",
    date: "January 1, 2025",
    slug: "zip-file-sharing-compress-multiple-files",
    tags: ["zip files", "compression", "multiple files", "tutorial"],
    icon: Archive
  },
  {
    id: 8,
    title: "File Sharing for Teams: Collaborate Without Compromising Security",
    excerpt: "Best practices for team file sharing with focus on security, speed, and ease of use across remote teams.",
    category: "Business",
    readTime: "10 min read",
    date: "December 30, 2024",
    slug: "file-sharing-teams-security-collaboration",
    tags: ["teams", "collaboration", "business", "security"],
    icon: Users
  },
  {
    id: 9,
    title: "No Download File Sharing: Transfer Files Without Installing Apps",
    excerpt: "Share files directly through your web browser. No software installation, no account creation, just instant sharing.",
    category: "Convenience",
    readTime: "4 min read",
    date: "December 28, 2024",
    slug: "no-download-file-sharing-browser-based",
    tags: ["no download", "browser", "web-based", "convenience"],
    icon: Globe
  },
  {
    id: 10,
    title: "Temporary File Sharing: Share Files That Auto-Delete",
    excerpt: "Protect your privacy with temporary file sharing that automatically removes files after download or time expiry.",
    category: "Privacy",
    readTime: "7 min read",
    date: "December 25, 2024",
    slug: "temporary-file-sharing-auto-delete",
    tags: ["temporary", "auto-delete", "privacy", "security"],
    icon: Shield
  },
  {
    id: 11,
    title: "Cross-Device File Transfer: PC to Phone to Tablet Guide",
    excerpt: "Universal methods to share files between any devices - Windows, Mac, iPhone, Android, and tablets.",
    category: "Guide",
    readTime: "11 min read",
    date: "December 22, 2024",
    slug: "cross-device-file-transfer-universal-guide",
    tags: ["cross-device", "universal", "pc", "mobile"],
    icon: Globe
  },
  {
    id: 12,
    title: "Encrypted File Sharing: Military-Grade Security for Everyone",
    excerpt: "How end-to-end encryption protects your files during transfer. Understanding security levels and choosing safe platforms.",
    category: "Security",
    readTime: "8 min read",
    date: "December 20, 2024",
    slug: "encrypted-file-sharing-military-grade-security",
    tags: ["encryption", "military-grade", "security", "protection"],
    icon: Shield
  },
  {
    id: 13,
    title: "Quick File Sharing for Professionals: Business Solutions",
    excerpt: "Professional file sharing tools for lawyers, doctors, consultants, and freelancers who need secure, fast transfers.",
    category: "Business",
    readTime: "9 min read",
    date: "December 18, 2024",
    slug: "quick-file-sharing-professionals-business",
    tags: ["professional", "business", "quick", "secure"],
    icon: Users
  },
  {
    id: 14,
    title: "Anonymous File Sharing: Transfer Files Without Identity",
    excerpt: "Share files completely anonymously without revealing personal information, email addresses, or creating accounts.",
    category: "Privacy",
    readTime: "6 min read",
    date: "December 15, 2024",
    slug: "anonymous-file-sharing-no-identity",
    tags: ["anonymous", "privacy", "no identity", "secure"],
    icon: Shield
  },
  {
    id: 15,
    title: "Direct File Transfer: Skip the Cloud, Share Directly",
    excerpt: "Benefits of direct device-to-device file transfer. Faster speeds, better privacy, and no server storage.",
    category: "Technology",
    readTime: "7 min read",
    date: "December 12, 2024",
    slug: "direct-file-transfer-skip-cloud",
    tags: ["direct transfer", "skip cloud", "device-to-device", "fast"],
    icon: Zap
  },
  {
    id: 16,
    title: "File Sharing Without Limits: Send Files of Any Size",
    excerpt: "Overcome email attachment limits and cloud storage restrictions. Share videos, presentations, and large datasets freely.",
    category: "Tips",
    readTime: "5 min read",
    date: "December 10, 2024",
    slug: "file-sharing-without-limits-any-size",
    tags: ["no limits", "any size", "large files", "unlimited"],
    icon: Zap
  },
  {
    id: 17,
    title: "Instant File Sharing: Zero Wait Time, Maximum Speed",
    excerpt: "Achieve lightning-fast file transfers with peer-to-peer technology. No queues, no waiting, just instant sharing.",
    category: "Speed",
    readTime: "6 min read",
    date: "December 8, 2024",
    slug: "instant-file-sharing-zero-wait-maximum-speed",
    tags: ["instant", "zero wait", "maximum speed", "fast"],
    icon: Zap
  },
  {
    id: 18,
    title: "Drag and Drop File Sharing: Simplest Way to Send Files",
    excerpt: "Master drag-and-drop file sharing interfaces. The most intuitive way to select and share files across platforms.",
    category: "User Experience",
    readTime: "4 min read",
    date: "December 5, 2024",
    slug: "drag-drop-file-sharing-simplest-way",
    tags: ["drag and drop", "simple", "intuitive", "easy"],
    icon: FileText
  },
  {
    id: 19,
    title: "Mobile File Sharing: Best Apps and Browser Solutions",
    excerpt: "Compare mobile file sharing apps vs browser-based solutions. Which works better for smartphones and tablets?",
    category: "Mobile",
    readTime: "8 min read",
    date: "December 3, 2024",
    slug: "mobile-file-sharing-apps-vs-browser",
    tags: ["mobile", "apps", "browser", "smartphone"],
    icon: Globe
  },
  {
    id: 20,
    title: "File Transfer Codes: Why Alphanumeric is Most Secure",
    excerpt: "Security analysis of different code systems. Why 6-digit alphanumeric codes offer the best balance of security and usability.",
    category: "Security",
    readTime: "7 min read",
    date: "December 1, 2024",
    slug: "file-transfer-codes-alphanumeric-secure",
    tags: ["transfer codes", "alphanumeric", "secure", "analysis"],
    icon: Shield
  },
  {
    id: 21,
    title: "Share Documents Securely: Best Practices for Professionals",
    excerpt: "How lawyers, accountants, and consultants can share confidential documents safely with clients and colleagues.",
    category: "Professional",
    readTime: "10 min read",
    date: "November 28, 2024",
    slug: "share-documents-securely-professionals",
    tags: ["documents", "professionals", "confidential", "safe"],
    icon: FileText
  },
  {
    id: 22,
    title: "Photo Sharing Without Social Media: Private Image Transfer",
    excerpt: "Share photos and images privately without posting on social media. Direct transfer methods for personal photos.",
    category: "Personal",
    readTime: "5 min read",
    date: "November 25, 2024",
    slug: "photo-sharing-without-social-media-private",
    tags: ["photo sharing", "private", "images", "personal"],
    icon: Share
  },
  {
    id: 23,
    title: "File Sharing Alternatives to WeTransfer: Better Options",
    excerpt: "Top alternatives to WeTransfer with better security, speed, and features. Compare free and paid options.",
    category: "Alternatives",
    readTime: "12 min read",
    date: "November 22, 2024",
    slug: "file-sharing-alternatives-wetransfer-better",
    tags: ["alternatives", "wetransfer", "comparison", "better options"],
    icon: Globe
  },
  {
    id: 24,
    title: "Remote Work File Sharing: Tools for Distributed Teams",
    excerpt: "Essential file sharing solutions for remote teams. Security, collaboration, and productivity in distributed work environments.",
    category: "Remote Work",
    readTime: "11 min read",
    date: "November 20, 2024",
    slug: "remote-work-file-sharing-distributed-teams",
    tags: ["remote work", "distributed teams", "collaboration", "productivity"],
    icon: Users
  },
  {
    id: 25,
    title: "Future of File Sharing: Trends and Predictions for 2025",
    excerpt: "Emerging trends in file sharing technology. Blockchain, AI integration, and the evolution of peer-to-peer networks.",
    category: "Future",
    readTime: "9 min read",
    date: "November 18, 2024",
    slug: "future-file-sharing-trends-predictions-2025",
    tags: ["future", "trends", "predictions", "emerging tech"],
    icon: Zap
  },
  {
    id: 1,
    title: "How to Share Files Securely Online in 2025: Complete Guide",
    excerpt: "Discover the safest methods to share files online with end-to-end encryption, no registration required, and complete privacy protection.",
    category: "Security",
    readTime: "8 min read",
    date: "January 15, 2025",
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
    date: "January 12, 2025",
    slug: "peer-to-peer-vs-cloud-storage-comparison",
    tags: ["p2p", "cloud storage", "comparison", "technology"],
    icon: Globe
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
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
  );
}
