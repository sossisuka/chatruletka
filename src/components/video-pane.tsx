"use client";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export function VideoPane({
  stream,
  muted,
  mirror,
  label,
  className = "",
}: {
  stream: MediaStream | null;
  muted: boolean;
  mirror?: boolean;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blockedStream, setBlockedStream] = useState<MediaStream | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream)
      void video.play().catch(() => {
        if (video.srcObject === stream) setBlockedStream(stream);
      });
    return () => {
      video.srcObject = null;
    };
  }, [stream]);
  return (
    <>
      <video
        ref={ref}
        data-testid={label === "Ваше видео" ? "local-video" : "remote-video"}
        aria-label={label}
        autoPlay
        playsInline
        muted={muted}
        onPlay={() => setBlockedStream(null)}
        className={`video-feed ${mirror ? "mirrored" : ""} ${className}`}
      />
      {stream && blockedStream === stream && (
        <button
          className="video-playback-button"
          onClick={() =>
            void ref.current?.play().catch(() => setBlockedStream(stream))
          }
        >
          <Play size={18} /> Воспроизвести видео
        </button>
      )}
    </>
  );
}
