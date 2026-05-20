import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import BrowseTermbase from "@/pages/browse-termbase";
import BrowseCategories from "@/pages/browse-categories";
import ManageCategories from "@/pages/manage-categories";
import AddWord from "@/pages/add-word";
import EditMeaning from "@/pages/edit-meaning";
import TermDetail from "@/pages/term-detail";
import ImageManagement from "@/pages/image-management";
import About from "@/pages/about";
import Privacy from "@/pages/privacy";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { SearchProvider } from "@/hooks/use-search";
import { ErrorDialogProvider } from "@/hooks/use-error-dialog";
import Helmet from "react-helmet";
import { AuthProvider } from "@/hooks/use-firebase-auth";
import { ProtectedRoute } from "@/components/protected-route";

function App() {
  const [location, setLocation] = useLocation();

  // Redirect to Browse Categories as the default landing page
  useEffect(() => {
    if (location === "/categories") {
      // We're already at the categories page, no need to navigate
    } else if (location === "/" || location === "") {
      setLocation("/categories");
    }
  }, [location]);

  return (
    <ErrorDialogProvider>
      <AuthProvider>
        <SearchProvider>
          <Helmet>
            <title>Adobe AEP Lexicon | The definitive terminology guide for Adobe Experience Platform</title>
            <meta name="description" content="A comprehensive dictionary of Adobe Experience Platform terms, definitions, and concepts maintained by the AEP community." />
            <meta property="og:site_name" content="Adobe AEP Lexicon" />
            <meta property="og:title" content="Adobe AEP Lexicon" />
            <meta property="og:description" content="The definitive terminology guide for Adobe Experience Platform" />
            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://lexiconaep.barrymann.com" />
            <meta property="og:image" content="https://lexiconaep.barrymann.com/logo-social.png" />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content="Adobe AEP Lexicon" />
            <meta name="twitter:description" content="The definitive terminology guide for Adobe Experience Platform" />
            <meta name="twitter:image" content="https://lexiconaep.barrymann.com/logo-social.png" />
          </Helmet>
          <Switch>
            <Route path="/" component={BrowseCategories} />
            <Route path="/categories" component={BrowseCategories} />
            <Route path="/manage-categories">
              <ProtectedRoute adminOnly={true}>
                <ManageCategories />
              </ProtectedRoute>
            </Route>
            <Route path="/add-word" component={AddWord} />
            <Route path="/edit-meaning" component={EditMeaning} />
            <Route path="/term/:slug" component={TermDetail} />
            <Route path="/term/id/:id" component={TermDetail} />
            <Route path="/images">
              <ProtectedRoute adminOnly={true}>
                <ImageManagement />
              </ProtectedRoute>
            </Route>
            <Route path="/about" component={About} />
            <Route path="/privacy" component={Privacy} />
            <Route path="/admin">
              <ProtectedRoute adminOnly={true}>
                <AdminPage />
              </ProtectedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </SearchProvider>
      </AuthProvider>
    </ErrorDialogProvider>
  );
}

export default App;