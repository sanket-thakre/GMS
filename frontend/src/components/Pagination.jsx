const PAGE_SIZES = [10, 20, 50, 100];

/**
 * Reusable pager. Props:
 *  - page (1-based), totalPages, total, pageSize
 *  - onPageChange(nextPage), onPageSizeChange(nextSize)
 */
export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const safeTotalPages = Math.max(totalPages || 0, 1);
  const canPrev = page > 1;
  const canNext = page < safeTotalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="text-sm text-gray-600">
        {typeof total === "number" ? (
          <span>
            {total} result{total === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            aria-label="Rows per page"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Prev
        </button>

        <span className="text-sm text-gray-700">
          Page {page} of {safeTotalPages}
        </span>

        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
