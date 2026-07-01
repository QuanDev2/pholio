import PostCard from "./PostCard";
import TagFilters from "../TagFilters";
import SearchInput from "../SearchInput";
import SortDropdown from "../SortDropdown";
import usePostFilter from "../../hooks/usePostFilter";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import type { Post } from "../../types";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { SortOrder } from "./postFilterReducer";

interface PostsPageResponse {
  data: Post[];
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
  pages: number;
  items: number;
}

export default function PostFeed() {
  const PAGE_LIMIT = 12;
  // infinite scroll
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery<PostsPageResponse>({
      queryKey: ["posts"],
      queryFn: ({ pageParam }) =>
        fetch(`http://localhost:4000/api/v1/posts?page=${pageParam}&limit=${PAGE_LIMIT}`).then(
          (r) => {
            return r.json();
          },
        ),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        return lastPage.next ?? undefined;
      },
      staleTime: 60000,
      select: (infiniteData: InfiniteData<PostsPageResponse>) => {
        // { data: Post[], total, page, limit }
        return {
          ...infiniteData,
          pages: infiniteData.pages.map((page) => ({
            ...page,
            data: page.data.map((post: Post) => {
              const formattedDate = new Intl.DateTimeFormat("en", {
                month: "long",
                day: "numeric",
                year: "numeric",
              }).format(new Date(post.createdAt));
              return { ...post, createdAt: formattedDate };
            }),
          })),
        };
      },
    });
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const posts: Post[] = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const publishedPosts = useMemo(() => posts.filter((post) => post.published), [posts]);

  const { filters, tags, hasActiveFilters, sortedPosts, dispatch } = usePostFilter(publishedPosts);

  // Memoize cb functions for filters
  const handleSearchChange = useCallback(
    (search: string) => dispatch({ type: "SET_SEARCH", search }),
    [dispatch],
  );

  const handleTagChange = useCallback(
    (tag: string) => dispatch({ type: "SET_TAG", tag }),
    [dispatch],
  );

  const handleSortChange = useCallback(
    (sort: SortOrder) => dispatch({ type: "SET_SORT", sort }),
    [dispatch],
  );

  const handleClearAll = useCallback(() => dispatch({ type: "CLEAR_ALL" }), [dispatch]);

  if (isLoading) return <p>beep... bop... page loading...</p>;
  if (isError) return <p>oops.. Something went wrong</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <SearchInput searchQuery={filters.search} onSearchQueryChange={handleSearchChange} />
        <TagFilters tags={tags} selectedTag={filters.tag} onTagChange={handleTagChange} />
        <SortDropdown sortOrder={filters.sort} onSortOrderChange={handleSortChange} />
        <button
          type="button"
          disabled={!hasActiveFilters}
          onClick={handleClearAll}
          className="h-11 w-full rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-teal-600 hover:text-teal-700 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 disabled:shadow-none md:w-auto"
        >
          Clear all
        </button>
      </div>

      <p className="text-sm text-zinc-600">
        Showing <span className="font-medium text-zinc-950">{sortedPosts.length}</span> posts
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sortedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <div ref={sentinelRef} />
      {isFetchingNextPage && <p>Hang in there.. loading more...</p>}
    </div>
  );
}
