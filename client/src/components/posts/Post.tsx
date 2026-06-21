import { useParams, useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import type { Photo, Post } from "../../types";
import Lightbox from "./Lightbox";
import { useQuery } from "@tanstack/react-query";

export default function Post() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const photoRef = useRef<HTMLButtonElement>(null);

  // useQuery
  const { data, isLoading, isError } = useQuery<Post>({
    queryKey: ["posts", slug],
    queryFn: () =>
      fetch(`http://localhost:4000/api/v1/posts/${slug}`).then((r) =>
        r.json().then((json) => json.data as Post),
      ),
    select: (post) => {
      const formattedDate = new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(post.createdAt));
      return { ...post, createdAt: formattedDate };
    },
    staleTime: 60000,
  });

  if (isLoading) return <p>Loading...</p>;

  if (isError || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-zinc-400">
        Post not found.
      </div>
    );
  }

  const coverPhoto = data.photos[0];

  const handlePhotoBtnOnClick = (photo: Photo, e: React.MouseEvent<HTMLButtonElement>) => {
    setIsLightboxOpen(true);
    setLightboxIdx(data.photos.indexOf(photo));
    photoRef.current = e.currentTarget;
  };

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="-mx-1 mb-6 flex cursor-pointer items-center gap-1.5 px-1 py-2 text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Back
        </button>

        {coverPhoto && (
          <img
            src={coverPhoto.url}
            alt={coverPhoto.caption ?? ""}
            className="w-full rounded-xl object-cover"
          />
        )}

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-zinc-950">{data.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
            <span>@{data.author.username}</span>
            <span>·</span>
            <span>{data.createdAt}</span>
            {data.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="mt-6 text-base leading-relaxed text-zinc-700">Rich Text Coming soon</p>
        </div>

        {data.photos.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {data.photos.map((photo) => (
              <button key={photo.id} onClick={(e) => handlePhotoBtnOnClick(photo, e)}>
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  className="w-full rounded-lg object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      {isLightboxOpen && (
        <Lightbox
          photos={data.photos}
          currIdx={lightboxIdx}
          onNext={() => setLightboxIdx(Math.min(lightboxIdx + 1, data.photos.length - 1))}
          onPrev={() => setLightboxIdx(Math.max(lightboxIdx - 1, 0))}
          onClose={() => setIsLightboxOpen(false)}
          triggerRef={photoRef}
        ></Lightbox>
      )}
    </>
  );
}
