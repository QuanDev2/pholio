import type { Post } from '../types'
import { useReducer, useMemo } from 'react'
import {
  filterReducer,
  initialState
} from '../components/posts/postFilterReducer'

export default function usePostFilter(posts: Post[]) {
  const [filters, dispatch] = useReducer(filterReducer, initialState)

  const tags = useMemo(
    () => ['All', ...Array.from(new Set(posts.flatMap((p) => p.tags)))],
    [posts]
  )

  const hasActiveFilters =
    filters.tag !== 'All' || filters.search !== '' || filters.sort !== 'newest'

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchesTag =
          filters.tag === 'All' || post.tags.includes(filters.tag)
        const matchesSearch =
          filters.search === '' ||
          post.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          post.bodyText.toLowerCase().includes(filters.search.toLowerCase())
        return matchesTag && matchesSearch
      }),
    [posts, filters]
  )

  const sortedPosts = useMemo(
    () =>
      [...filteredPosts].sort((a, b) => {
        const diff =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        return filters.sort === 'newest' ? -diff : diff
      }),
    [filteredPosts, filters.sort]
  )

  return { filters, tags, hasActiveFilters, sortedPosts, dispatch }
}
