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
  const isProduction = window.location.hostname === 'lexiconaep.barrymann.com';
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Google Tag Manager - only included in production */}
      {isProduction && (
        <Helmet>
          <script type="text/javascript">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-MLVBBLZ4');
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
      
      {/* Feedback Survey - disabled for now (component preserved) */}
      {/* <FeedbackSurvey /> */}
    </div>
  );
}
