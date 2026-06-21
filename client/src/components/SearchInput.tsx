type SearchInputProps = {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
};

export default function SearchInput({ searchQuery, onSearchQueryChange }: SearchInputProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <input
        id="photo-search"
        type="search"
        value={searchQuery}
        placeholder="Search by caption"
        className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
        onChange={(e) => {
          onSearchQueryChange(e.target.value);
        }}
      ></input>
    </div>
  );
}
