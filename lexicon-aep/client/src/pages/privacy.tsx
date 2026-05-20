import { useEffect } from "react";
import { Layout } from "@/components/layout";

export default function Privacy() {
  useEffect(() => {
    const container = document.getElementById("cookie-declaration");
    if (!container || container.querySelector("script#CookieDeclaration")) return;
    const s = document.createElement("script");
    s.id = "CookieDeclaration";
    s.src = "https://consent.cookiebot.com/634d26de-fd29-422f-a7fc-2048fecf7ed8/cd.js";
    s.type = "text/javascript";
    s.async = true;
    container.appendChild(s);
  }, []);
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="prose prose-blue max-w-none">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Introduction</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            The Adobe AEP Termbase respects your privacy and is committed to protecting your personal data. 
            This privacy policy will inform you about how we look after your personal data when you visit our website
            and tell you about your privacy rights and how the law protects you.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Information We Collect</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Our termbase is designed to be open and accessible without requiring user registration. We collect minimal data:
          </p>
          <ul className="text-lg text-gray-700 leading-relaxed list-disc pl-6 mb-6">
            <li className="mb-2">Anonymous usage data to improve our service</li>
            <li className="mb-2">IP addresses for security purposes</li>
            <li className="mb-2">Browser cookies essential for site functionality</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">How We Use Your Information</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            We use the information we collect in the following ways:
          </p>
          <ul className="text-lg text-gray-700 leading-relaxed list-disc pl-6 mb-6">
            <li className="mb-2">To provide and maintain our service</li>
            <li className="mb-2">To detect, prevent, and address technical issues</li>
            <li className="mb-2">To improve the user experience</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Data Security</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            We have implemented appropriate security measures to prevent your personal data from being accidentally lost, 
            used, or accessed in an unauthorized way, altered, or disclosed.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Changes to This Privacy Policy</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
            Privacy Policy on this page and updating the "Last updated" date.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Cookie Declaration</h2>
          <div id="cookie-declaration" className="mb-6" />

          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Contact Us</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            If you have any questions about this Privacy Policy, please contact us via the LinkedIn profile linked in the footer.
          </p>
        </div>
      </div>
    </Layout>
  );
}