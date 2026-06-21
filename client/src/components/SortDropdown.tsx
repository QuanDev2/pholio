import type { SortOrder } from "./posts/postFilterReducer";

type sortDropdownProps = {
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
};

export default function SortDropdown({ sortOrder, onSortOrderChange }: sortDropdownProps) {
  return (
    <div className="flex w-full flex-col gap-2 md:w-44">
      <div className="relative">
        <select
          id="sort-order"
          name="sort-order"
          value={sortOrder}
          className="h-11 w-full appearance-none rounded-md border border-zinc-300 bg-white px-3 pr-9 text-sm font-medium text-zinc-950 shadow-sm outline-none transition hover:border-zinc-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
          onChange={(e) => {
            onSortOrderChange(e.target.value as SortOrder);
          }}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">
          ▼
        </span>
      </div>
    </div>
  );
}
