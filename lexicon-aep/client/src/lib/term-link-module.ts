// Declare Quill type on Window
declare global {
  interface Window {
    Quill: any;
  }
}

// Define the inline blot format for term links
class InlineTermLink {
  static create(value: string | { url: string; termId: string; termName: string }) {
    let node = document.createElement('a');
    node.setAttribute('class', 'term-link');
    
    // Handle different value formats
    if (typeof value === 'object') {
      node.setAttribute('href', value.url);
      node.setAttribute('data-term-id', value.termId);
      node.setAttribute('data-term-name', value.termName);
      node.classList.add('term-link');
    } else {
      node.setAttribute('href', value);
    }
    
    return node;
  }

  static formats(domNode: HTMLElement) {
    const termId = domNode.getAttribute('data-term-id');
    const termName = domNode.getAttribute('data-term-name');
    const url = domNode.getAttribute('href');
    
    if (termId && termName) {
      return {
        url,
        termId,
        termName
      };
    }
    return domNode.getAttribute('href');
  }
}

// Create a custom button icon for term linking
const createTermLinkIcon = () => {
  const button = document.createElement('button');
  button.classList.add('ql-term-link');
  button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
  </svg>`;
  button.title = 'Insert Term Link';
  return button;
};

// Factory function to create and register the module
export default function createTermLinkModule() {
  // Return a simplified module with the term-link handler
  return {
    // This gets called when Quill initializes
    'term-link-handler': {
      // We're not actually registering a format here, but providing a simpler approach
      handler: () => {
        // Wait for Quill to be available on the window
        setTimeout(() => {
          // Find all term-link buttons and attach event listeners
          const termLinkButtons = document.querySelectorAll('.ql-term-link');
          termLinkButtons.forEach(button => {
            button.addEventListener('click', () => {
              // Find the nearest Quill editor
              const editorEl = button.closest('.quill')?.querySelector('.ql-editor');
              if (!editorEl || !window.Quill) return;
              
              const quill = window.Quill.find(editorEl.parentNode);
              if (!quill) return;
              
              const range = quill.getSelection();
              if (range && range.length > 0) {
                // Dispatch a custom event for the parent component to handle
                const event = new CustomEvent('term-link-button-clicked', {
                  detail: {
                    selection: range,
                    quill: quill
                  }
                });
                document.dispatchEvent(event);
              } else {
                console.log('Please select some text first');
                alert('Please select some text first before creating a term link');
              }
            });
          });
        }, 500); // Short delay to make sure Quill is initialized
      }
    }
  };
}

// Custom toolbar button
export function addTermLinkButton() {
  if (!Quill) return; // Safety check
  
  // Add term-link button to toolbar
  const toolbar = document.querySelector('.ql-toolbar');
  if (toolbar) {
    const termLinkButton = createTermLinkIcon();
    toolbar.appendChild(termLinkButton);
    
    // Add event listener
    termLinkButton.addEventListener('click', function() {
      const editorElement = document.querySelector('.ql-editor');
      if (!editorElement || !editorElement.parentNode) return;
      
      const quill = Quill.find(editorElement.parentNode);
      if (quill && quill.getModule && quill.getModule('toolbar')) {
        const toolbarModule = quill.getModule('toolbar');
        if (toolbarModule && toolbarModule.handlers && toolbarModule.handlers['term-link']) {
          toolbarModule.handlers['term-link'].call(toolbarModule);
        }
      }
    });
  }
}

// CSS for term links
export const termLinkCSS = `
  .term-link {
    color: #0E76A8;
    text-decoration: none;
    border-bottom: 1px dotted #0E76A8;
    padding-bottom: 1px;
    transition: all 0.2s ease-in-out;
    cursor: pointer;
  }
  
  .term-link:hover {
    color: #07496A;
    border-bottom-color: #07496A;
    background-color: rgba(14, 118, 168, 0.1);
  }
  
  .term-link-dialog {
    position: absolute;
    z-index: 9999;
    width: 300px;
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }
  
  .term-link-dialog-header {
    font-weight: 600;
    padding: 12px 16px;
    background-color: #f9f9f9;
    border-bottom: 1px solid #ddd;
  }
  
  .term-link-dialog-search {
    padding: 8px 16px;
    border-bottom: 1px solid #eee;
  }
  
  .term-link-dialog-results {
    max-height: 250px;
    overflow-y: auto;
    padding: 0;
  }
  
  .term-link-dialog-item {
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .term-link-dialog-item:hover {
    background-color: #f3f4f6;
  }
  
  .ql-term-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    width: 28px;
    padding: 3px 5px;
    margin-right: 5px;
    background: none;
    border: none;
    cursor: pointer;
    color: #444;
  }
  
  .ql-term-link:hover {
    color: #0E76A8;
  }
`;