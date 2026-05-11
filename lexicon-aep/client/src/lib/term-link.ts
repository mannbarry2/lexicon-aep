/**
 * CSS styles for term links and dialog
 */
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

/**
 * Configure ReactQuill with standard toolbar options
 * @returns Configuration object for ReactQuill
 */
export function getQuillConfig(onTermLinkClick?: (selection: any, quill: any) => void) {
  // Register the term-link button on first call
  if (typeof window !== 'undefined') {
    const Quill = (window as any).Quill;
    if (Quill && !Quill.imports['formats/term-link']) {
      // Add icon for the term-link button
      const icons = Quill.import('ui/icons');
      icons['term-link'] = '<svg viewBox="0 0 18 18"><path class="ql-fill" d="M14.9 9c0-.9-.4-1.7-1.1-2.4l.8-.8c1 1 1.6 2.3 1.6 3.7 0 1.4-.6 2.8-1.6 3.7l-.8-.8c.7-.7 1.1-1.5 1.1-2.4zm-4.4 1l1.5-1.5c.1-.1.1-.3 0-.4l-1.5-1.5c-.1-.1-.4-.1-.5 0l-.8.8c-.1.1-.1.3 0 .4l1.5 1.5-1.5 1.5c-.1.1-.1.3 0 .4l.8.8c.1.1.4.1.5 0zm-9.4-.7c.5-.5.9-1.1 1.1-1.8.2-.7.1-1.5-.2-2.2-.4-.7-1-1.3-1.7-1.5-.7-.3-1.5-.2-2.2.1-.4.2-.8.5-1.1.9l.8.8c.2-.2.4-.4.7-.5.4-.2.9-.2 1.3-.1.4.1.8.5 1 .9.2.4.3.9.1 1.3-.1.4-.4.7-.8 1l-2 1.3c-.2.1-.3.4-.2.7.1.2.4.4.7.3h.3l2.2-1.4.7-.7zM2.5 10.5c0 .9.4 1.7 1.1 2.4l-.8.8c-1-1-1.6-2.3-1.6-3.7 0-1.4.6-2.8 1.6-3.7l.8.8c-.7.7-1.1 1.5-1.1 2.4z"></path></svg>';
      
      // Mark as registered
      Quill.imports['formats/term-link'] = true;
    }
  }

  const handleTermLink = function(this: any) {
    const quill = this.quill;
    const range = quill.getSelection();

    if (range && onTermLinkClick) {
      onTermLinkClick(range, quill);
    }
  };

  return {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['link', 'term-link'],
        ['clean']
      ],
      handlers: {
        'term-link': handleTermLink
      }
    }
  };
}

/**
 * Helper function to format a term link in the Quill editor
 */
export function formatTermLink(quill: any, termId: number, termName: string, slug: string) {
  if (!quill || !quill.getSelection) return;
  
  const selection = quill.getSelection();
  if (!selection) return;
  
  // Format the selected text as a link
  quill.format('link', `/term/${slug}`);
  
  // Get the link node that was just created
  const linkNode = quill.root.querySelector(`a[href="/term/${slug}"]`);
  if (linkNode) {
    // Add custom attributes to identify it as a term link
    linkNode.setAttribute('data-term-id', termId.toString());
    linkNode.setAttribute('data-term-name', termName);
    linkNode.classList.add('term-link');
  }
}