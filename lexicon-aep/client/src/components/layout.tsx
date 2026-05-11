import { ReactNode, useEffect } from "react";
import { Sidebar, MobileNavigation } from "@/components/navigation";
import { Linkedin } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Helmet } from "react-helmet";
import FeedbackSurvey from "@/components/feedback-survey";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  // Determine if we're in production
  const isProduction = window.location.hostname === 'lexiconaep.com';
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Tealium script - only included in production */}
      {isProduction && (
        <Helmet>
          <script type="text/javascript">
          {`
            var utag_data = {
              iq_event_id : "", // A system variable that contains the ID of an iQ event and used to fire a tag when an event happens.
              tealium_event : "", // Contains the Tealium event.
              site_name : "", // Contains the site's name.
              site_description : "", // Contains the site's description.
              post_title : "", // Contains the post's title.
              post_category : "", // Contains the post's category, e.g. 'technology'.
              post_tags : "", // Contains the post tags, e.g. 'tag management'.
              post_author : "", // Contains the post author.
              post_date : "", // Contains the post date.
              page_type : "", // Contains the page type, e.g. 'archive', 'homepage', or 'search'.
              search_query : "", // Contains the search query conducted by user.
              search_results : "" // Contains the number of search results returned.
            }
          `}
          </script>
          <script type="text/javascript">
          {`
            (function(a,b,c,d){
            a='https://tags.tiqcdn.com/utag/zellera-sandbox/lexiconaep/prod/utag.js';
            b=document;c='script';d=b.createElement(c);d.src=a;d.type='text/java'+c;d.async=true;
            a=b.getElementsByTagName(c)[0];a.parentNode.insertBefore(d,a);
            })();
          `}
          </script>
        </Helmet>
      )}
      
      {/* Header - visible on all screens */}
      <Header />
      
      <div className="flex flex-1">
        {/* Main content area */}
        <div className="flex-1 overflow-auto flex flex-col">
          <main className="p-0 flex-1">
            {children}
          </main>
          
          {/* Footer */}
          <footer className="border-t border-border bg-background py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 text-sm">
                <div className="flex flex-col md:flex-row md:space-x-6 items-center space-y-3 md:space-y-0">
                  <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                </div>
                <div>
                  <a
                    href="https://www.linkedin.com/in/barrymann/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Linkedin className="h-4 w-4 mr-2" />
                    <span>Barry Mann</span>
                  </a>
                </div>
                <div className="text-muted-foreground">
                  © {new Date().getFullYear()} <a href="https://barrymann.com?utm_source=aep_lexicon&utm_medium=footer&utm_campaign=portfolio" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">AEP Lexicon</a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
      
      {/* Feedback Survey - will show up after 10 seconds if not already completed */}
      <FeedbackSurvey />
    </div>
  );
}
