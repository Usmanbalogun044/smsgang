'use client';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, lastPage, onPageChange }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between mt-5 px-1">
      <p className="text-xs text-slate-500">Page <span className="text-slate-300 font-medium">{currentPage}</span> of {lastPage}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1a1e35] border border-[#252b45] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252b45] hover:border-[#303860] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          Prev
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= lastPage}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-[#1a1e35] border border-[#252b45] rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#252b45] hover:border-[#303860] transition-colors"
        >
          Next
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}
