import { Layout } from "@/components/layout";

export default function About() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About Adobe AEP Lexicon</h1>
        
        <div className="prose prose-blue max-w-none">
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            Adobe AEP Lexicon is a community-driven technical dictionary web application for Adobe Experience Platform terminology, 
            enabling collaborative knowledge sharing through an interactive and user-friendly platform. Visit us at <a href="https://lexiconaep.com" className="text-blue-600 hover:text-blue-800 font-medium">https://lexiconaep.com</a>.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Our Mission</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            To create a comprehensive resource for Adobe Experience Platform terminology that is accessible, up-to-date, and collaboratively 
            maintained by the community. We aim to help professionals, developers, and learners better understand the Adobe ecosystem through 
            clear, accurate definitions and explanations.
          </p>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Key Features</h2>
          <ul className="text-lg text-gray-700 leading-relaxed list-disc pl-6 mb-6">
            <li className="mb-2">Comprehensive collection of Adobe Experience Platform terms</li>
            <li className="mb-2">Community voting system to highlight the most accurate and helpful definitions</li>
            <li className="mb-2">Clear distinction between current and legacy terminology</li>
            <li className="mb-2">Category-based organization for easier navigation</li>
            <li className="mb-2">Export functionality for offline reference</li>
            <li className="mb-2">Open contribution model allowing anyone to add and update terms</li>
          </ul>
          
          <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">Contact</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-6">
            For questions, feedback, or suggestions, please connect with us on LinkedIn.
          </p>
          
          <div className="mt-8 p-5 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-xl font-semibold text-blue-800 mb-3">Visit Us Online</h3>
            <p className="text-gray-700 mb-2">
              Our official website: <a href="https://lexiconaep.com" className="text-blue-600 hover:text-blue-800 font-semibold">https://lexiconaep.com</a>
            </p>
            <p className="text-sm text-gray-600">
              Adobe AEP Lexicon is the go-to resource for Adobe Experience Platform terminology.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}