export interface Photo {
  id: string
  url: string
  alt?: string
  caption?: string
  metaData?: PhotoMetaData
}

export interface PhotoMetaData {
  camera?: string
  lens?: string
  aperture?: string
  shutterSpeed?: string
  iso?: number
  focalLength?: string
  location?: string
  dateTaken?: string
}

export interface User {
  id: string
  username: string
  name: string
  email: string
  profilePictureUrl?: string
  bio?: string
}

export interface Post {
  id: string
  slug: string
  title: string
  bodyText: string
  authorUsername: string
  tags: string[]
  published: boolean
  coverPhotoId: string
  photos: Photo[]
  createdAt: string
}
