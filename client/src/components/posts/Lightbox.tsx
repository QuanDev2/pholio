import { createPortal } from "react-dom";
import React, { useRef, useEffect } from "react";
import type { Photo } from "../../types";
import type { RefObject } from "react";

interface Props {
  photos: Photo[];
  currIdx: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

interface MetaItemProps {
  label: string;
  value?: string | number;
}

function MetaItem({ label, value }: MetaItemProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-xs text-zinc-200">{value}</span>
    </div>
  );
}

export default function Lightbox({ photos, currIdx, onClose, onNext, onPrev, triggerRef }: Props) {
  const photo = photos[currIdx];
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleOnKeydown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        triggerRef.current?.focus();
        onClose();
        break;
      case "ArrowRight":
        onNext();
        break;
      case "ArrowLeft":
        onPrev();
        break;
    }
  };

  const isFirst = currIdx === 0;
  const isLast = currIdx === photos.length - 1;

  return createPortal(
    <div
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleOnKeydown}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm outline-none"
    >
      {/* close */}
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Close"
      >
        ✕
      </button>

      {/* panel — stop clicks from bubbling to backdrop */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col gap-4 overflow-y-auto rounded-2xl bg-zinc-900 p-4 shadow-2xl"
      >
        {/* image + nav */}
        <div className="relative flex items-center justify-center">
          <img
            src={photo.url}
            alt={photo.caption ?? ""}
            className="max-h-[65vh] w-full rounded-lg object-contain"
          />

          {!isFirst && (
            <button
              onClick={onPrev}
              className="absolute left-2 rounded-full bg-black/50 px-3 py-2 text-white transition hover:bg-black/70"
              aria-label="Previous photo"
            >
              ‹
            </button>
          )}
          {!isLast && (
            <button
              onClick={onNext}
              className="absolute right-2 rounded-full bg-black/50 px-3 py-2 text-white transition hover:bg-black/70"
              aria-label="Next photo"
            >
              ›
            </button>
          )}
        </div>

        {/* caption + metadata below image */}
        <div className="flex flex-col gap-3 border-t border-zinc-700 pt-3">
          <div className="flex items-start justify-between gap-4">
            {photo.caption && (
              <p className="text-sm leading-relaxed text-zinc-400">{photo.caption}</p>
            )}
            <span className="shrink-0 text-xs text-zinc-600">
              {currIdx + 1} / {photos.length}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2">
            <MetaItem label="Camera" value={photo.metaData?.camera} />
            <MetaItem label="Aperture" value={photo.metaData?.aperture} />
            <MetaItem label="Location" value={photo.metaData?.location} />
            <MetaItem label="Lens" value={photo.metaData?.lens} />
            <MetaItem label="Shutter Speed" value={photo.metaData?.shutterSpeed} />
            <MetaItem label="Date Taken" value={photo.metaData?.dateTaken} />
            <MetaItem label="Focal Length" value={photo.metaData?.focalLength} />
            <MetaItem label="ISO" value={photo.metaData?.iso} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
