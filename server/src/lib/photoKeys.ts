// Single source of truth for photo S3 keys, shared by the image-processing
// worker (writes variants) and the delete route (removes them). Keeping the
// pattern here stops the two from drifting.

// The 3 WebP sizes the worker produces. width: null = re-encode at original dims.
export const VARIANTS = [
  { name: "thumbnail", width: 400 },
  { name: "medium", width: 1200 },
  { name: "full", width: null },
] as const;

// S3 key for one variant: photos/{postId}/{photoId}/{name}.webp
export const variantKey = (postId: string, photoId: string, name: string) =>
  `photos/${postId}/${photoId}/${name}.webp`;

// All three variant keys for a photo (for batch delete).
export const variantKeys = (postId: string, photoId: string) =>
  VARIANTS.map(({ name }) => variantKey(postId, photoId, name));
