import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 15,
  onPageChange,
  isLoading = false,
  className = '',
}) => {
  if (totalItems <= 0 || totalPages <= 1) {
    if (totalItems > 0) {
      return (
        <div className={`flex items-center justify-between px-4 py-3 bg-[#FAF7F5]/50 border-t border-[#E8DDD7] text-xs text-[#756366] ${className}`}>
          <span>
            Showing <strong className="font-semibold text-[#2D1F23]">1</strong> to{' '}
            <strong className="font-semibold text-[#2D1F23]">{totalItems}</strong> of{' '}
            <strong className="font-semibold text-[#2D1F23]">{totalItems}</strong> entries
          </span>
          <span className="text-[11px] font-medium text-[#756366] bg-white px-2.5 py-1 rounded-lg border border-[#E8DDD7]">
            Page 1 of 1
          </span>
        </div>
      );
    }
    return null;
  }

  const startItem = Math.min((currentPage - 1) * itemsPerPage + 1, totalItems);
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#FAF7F5]/50 border-t border-[#E8DDD7] text-xs text-[#756366] ${className}`}
    >
      <div className="text-[11px] sm:text-xs">
        Showing <strong className="font-semibold text-[#2D1F23]">{startItem}</strong> to{' '}
        <strong className="font-semibold text-[#2D1F23]">{endItem}</strong> of{' '}
        <strong className="font-semibold text-[#2D1F23]">{totalItems}</strong> entries
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-[#E8DDD7] bg-white text-[#63474D] hover:bg-[#FAF7F5] disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs font-semibold gap-1"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-[#756366] text-xs select-none">
                  •••
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${isCurrent
                    ? 'bg-[#63474D] text-white shadow-xs'
                    : 'bg-white border border-[#E8DDD7] text-[#756366] hover:bg-[#FAF7F5] hover:text-[#2D1F23]'
                  }`}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-[#E8DDD7] bg-white text-[#63474D] hover:bg-[#FAF7F5] disabled:opacity-40 disabled:pointer-events-none transition-colors text-xs font-semibold gap-1"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

