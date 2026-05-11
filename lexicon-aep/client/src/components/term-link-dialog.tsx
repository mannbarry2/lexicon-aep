import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { X, Search, Loader2 } from 'lucide-react';

interface TermLinkDialogProps {
  position: { top: number; left: number };
  onClose: () => void;
  onSelect: (termId: number, termName: string, slug: string) => void;
}

export function TermLinkDialog({ position, onClose, onSelect }: TermLinkDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fetch term names
  const { 
    data: terms = [], 
    isLoading 
  } = useQuery<{id: number, name: string, slug: string}[]>({
    queryKey: ["/api/terms/names"],
  });
  
  // Filter terms based on search query
  const filteredTerms = terms.filter(term => 
    term.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Focus the search input when the dialog opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Handle clicking outside the dialog
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);
  
  return (
    <div 
      ref={dialogRef}
      className="term-link-dialog"
      style={{ 
        top: position.top, 
        left: position.left,
        maxWidth: '300px'
      }}
    >
      <div className="term-link-dialog-header flex justify-between items-center">
        <span>Link to Term</span>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={16} />
        </button>
      </div>
      
      <div className="term-link-dialog-search flex items-center gap-2 p-2 border-b border-gray-200">
        <Search size={18} className="text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none shadow-none focus-visible:ring-0 h-8 p-0"
        />
      </div>
      
      <div className="term-link-dialog-results">
        {isLoading ? (
          <div className="p-4 flex justify-center items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filteredTerms.length > 0 ? (
          filteredTerms.map(term => (
            <div 
              key={term.id}
              className="term-link-dialog-item hover:bg-gray-100 cursor-pointer"
              onClick={() => onSelect(term.id, term.name, term.slug)}
            >
              {term.name}
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            No terms found
          </div>
        )}
      </div>
    </div>
  );
}