import type { Post } from '../../types'
import { Link } from 'react-router-dom'
import { memo } from 'react'

interface Props {
  post: Post
}

const PostCard = memo(function PostCard({ post }: Props) {
  const coverPhoto = post.photos[0]

  return (
    <Link
      to={`/posts/${post.slug}`}
      className='relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
    >
      {coverPhoto && (
        <img
          src={coverPhoto.url}
          alt={coverPhoto.caption ?? ''}
          className='aspect-[4/3] w-full object-cover'
        />
      )}
      {!post.published && (
        <span className='absolute top-2 left-2 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-white'>
          Draft
        </span>
      )}
      <div className='flex flex-col gap-3 p-4'>
        <div className='text-base font-semibold text-zinc-950'>
          {post.title}
        </div>
        <p className='line-clamp-2 text-sm text-zinc-500'>
          Rich Text Coming soon
        </p>
        <div className='flex flex-wrap items-center gap-2 text-xs text-zinc-500'>
          {post.tags[0] && (
            <span className='rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700'>
              {post.tags[0]}
            </span>
          )}
          <span>{post.createdAt}</span>
        </div>
      </div>
    </Link>
  )
})

export default PostCard
