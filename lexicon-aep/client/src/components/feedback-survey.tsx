import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseAuth } from "@/hooks/use-firebase-auth";

export default function FeedbackSurvey() {
  const [isVisible, setIsVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useFirebaseAuth();

  // Show the survey popup after 10 seconds if not already completed
  useEffect(() => {
    // Check if the user has already completed a survey in this session
    const surveyCompleted = localStorage.getItem('feedbackSurveyCompleted');
    
    if (surveyCompleted) {
      // Don't show the survey if already completed
      return;
    }
    
    // Show the survey after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Please provide some feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Using a different approach - submitting to an alternative API endpoint
      // Send user feedback directly to your email using FormSubmit.co
      
      // Submit feedback via FormSubmit.co
      try {
        // Create a hidden iframe to target the form submission
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_feedback_iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        // Create a form element
        const form = document.createElement('form');
        form.action = 'https://formsubmit.co/mannbarry2@gmail.com';
        form.method = 'POST';
        form.target = 'hidden_feedback_iframe';
        form.style.display = 'none';
        
        // Add the required fields
        const fields = [
          { name: 'feedback', value: feedback },
          { name: 'url', value: window.location.href },
          { name: 'user', value: currentUser?.email || 'Anonymous' },
          { name: 'timestamp', value: new Date().toLocaleString() },
          // Important: Redirect after submission to prevent leaving the page
          { name: '_next', value: window.location.href },
          // This is important - it prevents the captcha page
          { name: '_captcha', value: 'false' }
        ];
        
        // Add each field to the form
        fields.forEach(field => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = field.name;
          input.value = field.value.toString();
          form.appendChild(input);
        });
        
        // Add form to document and submit
        document.body.appendChild(form);
        form.submit();
        
        // Set up cleanup
        setTimeout(() => {
          if (document.body.contains(form)) document.body.removeChild(form);
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 5000);
        
      } catch (error) {
        console.error("Error in form submission:", error);
      }
      
      // Regardless of the actual submission result (which we can't easily check due to CORS),
      // we'll update the UI to indicate completion
      setHasSubmitted(true);
      localStorage.setItem('feedbackSurveyCompleted', 'true');
      
      // Only show the thank you message in the survey itself, not as a toast
      // We no longer need this toast since the survey already shows a thank you message
      
      // Close the survey after showing thank you message
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Submission failed",
        description: "There was an error submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 relative">
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-center">We value your feedback!</h2>
          <p className="text-gray-600 text-center mt-2">
            {hasSubmitted 
              ? "Thank you for your feedback!" 
              : "Help us improve the AEP Lexicon by sharing your thoughts."}
          </p>
        </div>
        
        {!hasSubmitted ? (
          <>
            <Textarea
              placeholder="What do you think about the AEP Lexicon? Any suggestions for improvement?"
              className="mb-4 min-h-[120px]"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isSubmitting}
            />
            
            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0"
              >
                {isSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <Button 
              onClick={handleClose}
              className="bg-[#2563eb] text-white hover:bg-[#2563eb]/90 border-0"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}