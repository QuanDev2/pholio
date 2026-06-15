import { useParams } from 'react-router-dom'
import PostCard from './posts/PostCard'
import { useCurrentUser } from '../context/CurrentUserContext'
import { useQuery } from '@tanstack/react-query'
import type { Post } from '../types'

export default function Portfolio() {
  const { username: paramUsername } = useParams()
  const { user: loggedInUser } = useCurrentUser()
  const isOwner = paramUsername === loggedInUser?.username

  const { data, isLoading, isError } = useQuery<Post[]>({
    queryKey: ['posts', 'user', paramUsername],
    queryFn: () =>
      fetch(`http://localhost:3001/posts?authorUsername=${paramUsername}`).then(
        (r) => r.json() as Promise<Post[]>
      ),
    select: (posts) => {
      return posts
        .filter(
          (post) =>
            post.authorUsername === paramUsername && (post.published || isOwner)
        )
        .map((post) => {
          const formattedDate = new Intl.DateTimeFormat('en', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }).format(new Date(post.createdAt))
          return { ...post, createdAt: formattedDate }
        })
    },
    staleTime: 60000
  })

  if (isLoading) return <p>Loading...</p>
  if (isError || !data) return <p>page not found</p>

  return (
    <div>
      <div id='profile-header'>
        <div>username: {paramUsername}</div>
        <div>post count: {data.length}</div>
      </div>
      <div
        id='portfolio-content'
        className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'
      >
        {data.length ? (
          <>
            {data.map((post) => (
              <PostCard key={post.id} post={post}></PostCard>
            ))}
          </>
        ) : (
          `No posts yet`
        )}
      </div>
    </div>
  )
}
