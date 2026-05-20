import { ReactNode, useEffect } from "react";
import { Sidebar, MobileNavigation } from "@/components/navigation";
import { FaLinkedinIn, FaGithub, FaMedium, FaWhatsapp, FaYoutube } from "react-icons/fa";
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
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                  <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                    About
                  </Link>
                  <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                    Privacy
                  </Link>
                  <span className="text-muted-foreground">
                    © {new Date().getFullYear()}{" "}
                    <a
                      href="https://barrymann.com?utm_source=aep_lexicon&utm_medium=footer&utm_campaign=portfolio"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      barrymann.com
                    </a>
                  </span>
                </div>
                <div className="flex items-center gap-5 text-muted-foreground">
                  <a
                    href="https://www.linkedin.com/in/barrymann/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="hover:text-foreground transition-colors"
                  >
                    <FaLinkedinIn className="h-5 w-5" />
                  </a>
                  <a
                    href="https://github.com/mannbarry2"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                    className="hover:text-foreground transition-colors"
                  >
                    <FaGithub className="h-5 w-5" />
                  </a>
                  <a
                    href="https://medium.com/barrymann2"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Medium"
                    className="hover:text-foreground transition-colors"
                  >
                    <FaMedium className="h-5 w-5" />
                  </a>
                  <a
                    href="https://wa.me/447484281538"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    className="hover:text-foreground transition-colors"
                  >
                    <FaWhatsapp className="h-5 w-5" />
                  </a>
                  <a
                    href="https://www.youtube.com/@barrymann-b4i"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="hover:text-foreground transition-colors"
                  >
                    <FaYoutube className="h-5 w-5" />
                  </a>
                </div>
              </div>
              <div className="mt-6 text-center text-[10px] text-muted-foreground/60">
                Built {new Date(
                  typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : Date.now()
                ).toLocaleString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
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
