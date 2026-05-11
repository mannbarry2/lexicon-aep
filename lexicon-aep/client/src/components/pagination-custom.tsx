import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationCustomProps {
  pageCount: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function PaginationCustom({
  pageCount,
  currentPage,
  onPageChange,
}: PaginationCustomProps) {
  // Handle the case of no pages
  if (pageCount <= 0) return null;

  const handlePageClick = (page: number) => {
    if (page === currentPage) return;
    onPageChange(page);
  };

  // Determine which page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    // Always show first page
    pages.push(1);
    
    if (pageCount <= 7) {
      // Show all pages if there are 7 or fewer
      for (let i = 2; i < pageCount; i++) {
        pages.push(i);
      }
    } else {
      // Show some pages with ellipsis
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      
      // Pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(pageCount - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < pageCount - 2) {
        pages.push("ellipsis");
      }
    }
    
    // Always show last page if there's more than 1 page
    if (pageCount > 1) {
      pages.push(pageCount);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) {
                handlePageClick(currentPage - 1);
              }
            }}
            tabIndex={currentPage === 1 ? -1 : 0}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>

        {pageNumbers.map((page, index) => (
          <PaginationItem key={`${page}-${index}`}>
            {page === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handlePageClick(page as number);
                }}
                isActive={page === currentPage}
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < pageCount) {
                handlePageClick(currentPage + 1);
              }
            }}
            tabIndex={currentPage === pageCount ? -1 : 0}
            className={currentPage === pageCount ? "pointer-events-none opacity-50" : ""}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}