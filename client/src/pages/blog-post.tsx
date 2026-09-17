import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Tag } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/seo-head";
import { blogPostsData } from "@/data/blog-posts-data";

const getBlogPost = (slug: string) => {
  return blogPostsData[slug] || null;
};

export default function BlogPost() {
  const [match, params] = useRoute("/blog/:slug");

  if (!match || !params?.slug) {
    return <div>Post not found</div>;
  }

  const post = getBlogPost(params.slug);

  if (!post) {
    return (
      <>
        <SEOHead
          title="Article Not Found | HexaSend Blog"
          description="The requested blog post could not be found."
        />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Article Not Found</h1>
              <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or has been moved.</p>
              <Link href="/blog">
                <Button className="w-full">Return to Blog</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const postUrl = `https://hexasend.com/blog/${post.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt,
    "image": "https://hexasend.com/og-image.jpg",
    "author": {
      "@type": "Person",
      "name": "Girjesh Suryawanshi",
      "url": "https://hexasend.com/about"
    },
    "publisher": {
      "@type": "Organization",
      "name": "HexaSend",
      "logo": {
        "@type": "ImageObject",
        "url": "https://hexasend.com/pwa-512x512.png"
      }
    },
    "datePublished": new Date(post.date).toISOString(),
    "dateModified": new Date(post.date).toISOString()
  };

  return (
    <>
      <SEOHead
        title={`${post.title} | HexaSend Blog`}
        description={post.excerpt}
        keywords={post.tags.join(', ')}
        canonicalUrl={postUrl}
        ogImage="https://hexasend.com/og-image.jpg"
        structuredData={articleSchema}
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
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

              {/* Main Article HTML Content */}
              <div
                className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Author E-E-A-T Bio Box */}
              <div className="mt-10 p-6 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-md">
                  GS
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold text-gray-900">Girjesh Suryawanshi</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">Verified Author</span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium mb-1">Senior Full-Stack Engineer & Cybersecurity Specialist</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    With over 15 years of professional software architecture experience, Girjesh specializes in real-time WebRTC peer-to-peer communication, network optimization, and privacy-focused data exchange protocols.
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Try Instant Sharing Now</h3>
                <p className="text-gray-600 mb-4">
                  Share files with a 6-digit code—no signup, no USB, no hassle. Works on any device.
                </p>
                <Link href="/">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-lg">
                    Try Instant Sharing Now
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
                    <h4 className="font-semibold text-gray-900 mb-2">Best Free File Transfer Services 2026</h4>
                    <p className="text-sm text-gray-600">Top platforms that don't require sign-ups for instant file sharing in 2026.</p>
                  </div>
                </Link>
                <Link href="/blog/fastest-ways-to-transfer-large-files-2026">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <h4 className="font-semibold text-gray-900 mb-2">Fastest Ways to Transfer Large Files</h4>
                    <p className="text-sm text-gray-600">Learn how to move multi-gigabyte files at lightning speed.</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
