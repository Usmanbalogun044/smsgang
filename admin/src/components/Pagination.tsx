'use client';

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, lastPage, onPageChange }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1a1e35] border border-slate-200 dark:border-[#252b45] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#252b45] hover:border-slate-300 dark:hover:border-[#303860] transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        Prev
      </button>
      
      <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#1a1e35] rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-transparent dark:border-[#252b45]">
         <span className="text-slate-900 dark:text-white font-bold">{currentPage}</span> / {lastPage}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= lastPage}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1a1e35] border border-slate-200 dark:border-[#252b45] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#252b45] hover:border-slate-300 dark:hover:border-[#303860] transition-colors"
      >
        Next
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      </button>
    </div>
  );
}
