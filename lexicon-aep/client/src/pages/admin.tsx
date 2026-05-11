import { useState } from "react";
import { Layout } from "@/components/layout";
import { ImportButton } from "@/components/import-button";
import { ExportButton } from "@/components/export-button";
import { PDFExportButton } from "@/components/pdf-export-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download, ImageIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TermWithMetadata } from "@shared/schema";
import { TermCard } from "@/components/term-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TermBulkActions } from "@/components/term-bulk-actions";

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all terms
  const { data: terms, isLoading } = useQuery<TermWithMetadata[]>({
    queryKey: ["/api/terms/by-category"],
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  });

  // Prepare terms with component for bulk actions
  const termsWithComponent = terms?.map(term => ({
    ...term,
    component: <TermCard term={term} />
  })) || [];

  return (
    <Layout>
      <div className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-8">Admin Only</h1>
        
        <Alert variant="destructive" className="mb-8">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription>
            Do not use this functionality - or Barry will be annoyed!
          </AlertDescription>
        </Alert>
        
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Term Import & Export</h2>
          <p className="text-gray-600 mb-4">
            Import terms from a CSV file or export all terms to CSV/PDF formats for backup, analysis, or printing.
          </p>
          <div className="flex flex-wrap gap-4">
            <ImportButton 
              onImportComplete={() => {
                window.location.reload();
              }}
            />
            <ExportButton />
            <PDFExportButton />
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => {
                // Sample CSV content
                const csvContent = `id,name,definition,categories,categoryIds,isLegacy,currentTerm,currentTermId,legacyNames,legacyTermIds,upvotes,downvotes
,"API Connector","A tool that allows users to bring data from third-party sources into Adobe Experience Platform via RESTful APIs.","CJA, UX","33, 35",No,,,,,0,0
,"Activation","The process of making audience segments available for use in marketing channels and destinations.","CJA, RT-CDP Collaboration, TLA (3 letter abbreviation)","33, 29, 34",No,,,,,0,0
,"Offer Decisioning","A capability that delivers the best offer and experience to your customers across all touchpoints at the right time.","CJA, UX","33, 35",No,,,,,0,0
,"Flow Service","An API service used to collect and centralize customer data from various sources within Adobe Experience Platform.","CJA, UX","33, 35",No,,,,,0,0
,"Legacy Launch","The previous name for Adobe Experience Platform Data Collection before rebranding.","CJA, ACS Data Collection","33, 31",Yes,"ACS Data Collection",81,,,,0,0
,"Visitor ID Service","Legacy term for the Adobe Experience Cloud Identity Service that manages cross-solution identity.","AA (Adobe Analytics), TLA (3 letter abbreviation)","32, 34",Yes,,,,,0,0
,"DTM","Dynamic Tag Management, the predecessor to Adobe Experience Platform Tags for managing analytics and marketing tags.","CJA, TLA (3 letter abbreviation)","33, 34",Yes,,,,,0,0
,"Data Workbench","Legacy analytics tool that provided multi-dimensional analysis of customer data across channels.","AA (Adobe Analytics), UX","32, 35",Yes,,,,,0,0
,"Edge Configuration","Settings that determine how data is processed at the edge network for real-time personalization.","CJA, RT-CDP Collaboration","33, 29",No,,,,,0,0
,"Query Service Notebooks","Interactive environment for querying and visualizing data using SQL within Adobe Experience Platform.","CJA, AA (Adobe Analytics)","33, 32",No,,,,,0,0`;
                
                // Create a blob with the CSV content
                const blob = new Blob([csvContent], { type: 'text/csv' });
                
                // Create a download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'sample-import.csv';
                
                // Add to the DOM and trigger the download
                document.body.appendChild(a);
                a.click();
                
                // Clean up
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }}
            >
              <Download className="h-4 w-4" /> Download Sample Import CSV
            </Button>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Glossary Imports</h2>
          <p className="text-gray-600 mb-4">
            Pre-formatted glossary files ready for import.
          </p>
          <div className="space-y-4">
            <div className="p-4 border rounded-md bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">RT-CDP Collaboration Terms</h3>
                  <p className="text-sm text-gray-500">24 terms for category ID 29</p>
                </div>
                <Button 
                  variant="default" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    // CSV content
                    const csvContent = `Term Name,Definition,Categories,Category IDs,Is Legacy,Current Term ID
Advertiser,Any entity that will spend marketing budget to reach audiences across publishers or other brand partners to achieve goals of brand awareness prospecting re-engagement and conversions.,RT-CDP Collaboration,29,false,
Cloud storage,A cloud computing solution that enables storing data and files on the internet through a provider like AWS Azure or GCP.,RT-CDP Collaboration,29,false,
Connection request,A formal request sent from one organization to another to establish a data-sharing connection.,RT-CDP Collaboration,29,false,
Connection settings,Settings sent by the connection initiator to the collaborator after a request is accepted governing collaboration rules.,RT-CDP Collaboration,29,false,
Data clean room,A secure environment allowing participants to use data assets with strict access controls for agreed uses.,RT-CDP Collaboration,29,false,
Data collaboration,Combining and analyzing data within a company or with partners for targeting measurement and insights.,RT-CDP Collaboration,29,false,
Data connection,The source from where data is imported into RT-CDP Collaboration; currently only Experience Platform is supported.,RT-CDP Collaboration,29,false,
Data sharing agreement,A contract outlining terms and conditions for data sharing between parties.,RT-CDP Collaboration,29,false,
Device identifier,A unique number associated with a device used for tracking and targeting.,RT-CDP Collaboration,29,false,
Invite,A request sent to a user or organization to join a project or data collaboration.,RT-CDP Collaboration,29,false,
Match keys,Unique identifiers used to link records across datasets for integration and analysis.,RT-CDP Collaboration,29,false,
Overlap,Common audience segments between datasets used to identify collaboration opportunities.,RT-CDP Collaboration,29,false,
Project,A workspace for collaborating on data integration and segmentation tasks.,RT-CDP Collaboration,29,false,
Public audience,An audience discoverable by collaborators within a project as opposed to private or custom audiences.,RT-CDP Collaboration,29,false,
Publisher,An operator of online content where personal data is collected with consent for advertising or measurement.,RT-CDP Collaboration,29,false,
Sketches,Simplified audience data summaries enabling overlap analysis without sharing personal data.,RT-CDP Collaboration,29,false,
Use case,A specific scenario that RT-CDP Collaboration can address like audience discovery or campaign measurement.,RT-CDP Collaboration,29,false,
Adobe Experience Cloud Collaboration,A feature set that allows organizations to collaborate on customer data directly within the Adobe Experience Cloud ecosystem for targeted advertising and measurement.,RT-CDP Collaboration,29,false,
RT-CDP Collaboration,A component of Adobe Real-time Customer Data Platform (RT-CDP) that allows data sharing between parties under controlled conditions enabling data clean room functionality.,RT-CDP Collaboration,29,false,
Partner Data Marketplace,An ecosystem within RT-CDP Collaboration where organizations can discover partners with complementary data assets for collaboration opportunities.,RT-CDP Collaboration,29,false,
First-party data collaboration,The process of securely sharing and analyzing first-party data between partners within the RT-CDP Collaboration environment.,RT-CDP Collaboration,29,false,
Collaboration template,Predefined configurations in RT-CDP Collaboration that establish rules and parameters for specific types of data partnerships.,RT-CDP Collaboration,29,false,
Data clean room partner,An organization that participates in data sharing arrangements through RT-CDP Collaboration's data clean room environment.,RT-CDP Collaboration,29,false,
Differential privacy,A data protection technique used in RT-CDP Collaboration that adds statistical noise to query results to protect individual records while preserving overall insights.,RT-CDP Collaboration,29,false,`;
                    
                    // Create a blob with the CSV content
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    
                    // Create a download link
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'rt_cdp_collaboration_glossary.csv';
                    
                    // Add to the DOM and trigger the download
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }}
                >
                  <Download className="h-4 w-4" /> Download CSV
                </Button>
              </div>
              <p className="text-sm">
                Glossary terms for Adobe Real-time CDP Collaboration features, including data clean rooms, 
                collaboration settings, and partnership models.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Bulk Term Management</h2>
          <p className="text-gray-600 mb-4">
            Select multiple terms to perform bulk actions like deletion.
          </p>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-64">
                  <Skeleton className="h-full w-full" />
                </div>
              ))}
            </div>
          ) : (
            <TermBulkActions 
              terms={termsWithComponent}
              onBulkActionComplete={() => {
                // Refetch the terms after bulk action
                window.location.reload();
              }}
            />
          )}
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Image Management</h2>
          <p className="text-gray-600 mb-4">
            View and manage all term images stored in Firebase Storage.
          </p>
          <Button 
            onClick={() => window.location.href = "/images"}
            variant="default"
            className="flex items-center gap-2"
          >
            <ImageIcon className="h-4 w-4" /> View Image Management
          </Button>
        </div>
      </div>
    </Layout>
  );
}