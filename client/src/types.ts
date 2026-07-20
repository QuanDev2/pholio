export type PhotoStatus = "pending" | "processing" | "ready" | "error";

export interface Photo {
  id: string;
  key: string; // s3 key
  url: string;
  status: PhotoStatus; // server-owned; Week 6's worker drives pending -> ready
  caption?: string;
  metaData?: PhotoMetaData;
}

export interface PhotoMetaData {
  camera?: string;
  lens?: string;
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  focalLength?: string;
  location?: string;
  dateTaken?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  profilePictureUrl?: string;
  bio?: string;
}

export type PostAuthor = Omit<User, "email">;

export interface Post {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  author: PostAuthor;
  tags: string[];
  published: boolean;
  photos: Photo[];
  createdAt: string;
}
