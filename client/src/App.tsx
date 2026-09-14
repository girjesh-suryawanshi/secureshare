import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Blog from "@/pages/blog";
import BlogPost from "@/pages/blog-post";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import Disclaimer from "@/pages/disclaimer";
import ReportAbuse from "@/pages/report-abuse";
import ContentPolicy from "@/pages/content-policy";
import RoomChat from "@/pages/room-chat";
import NotFound from "@/pages/not-found";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/share/:code" component={Home} />
          <Route path="/chat" component={RoomChat} />
          <Route path="/room/:code" component={RoomChat} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/blog" component={Blog} />
          <Route path="/blog/:slug" component={BlogPost} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/disclaimer" component={Disclaimer} />
          <Route path="/report-abuse" component={ReportAbuse} />
          <Route path="/content-policy" component={ContentPolicy} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
