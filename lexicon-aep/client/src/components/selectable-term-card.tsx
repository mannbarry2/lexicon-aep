import { TermCard } from "@/components/term-card";
import { TermWithMetadata } from "@shared/schema";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectableTermCardProps {
  term: TermWithMetadata;
  selected: boolean;
  onToggleSelect: (termId: number) => void;
}

export function SelectableTermCard({ term, selected, onToggleSelect }: SelectableTermCardProps) {
  return (
    <div className="relative">
      <div 
        className={cn(
          "absolute left-0 top-0 z-10 p-3 transition-opacity",
          selected ? "opacity-100" : "opacity-0 hover:opacity-100"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(term.id);
        }}
      >
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer",
          selected 
            ? "bg-primary border-primary text-white" 
            : "border-gray-400 bg-white hover:border-primary"
        )}>
          {selected && <Check className="h-4 w-4" />}
        </div>
      </div>
      <div className={selected ? "opacity-75" : ""}>
        <TermCard term={term} />
      </div>
    </div>
  );
}