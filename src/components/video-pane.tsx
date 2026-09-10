"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

  const playCurrentStream = useCallback(() => {
    const video = ref.current;
    if (!video || !stream) return;
    void video.play().catch(() => {
      if (video.srcObject === stream) setBlockedStream(stream);
    });
  }, [stream]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.srcObject = stream;
    setBlockedStream(null);
    if (stream) playCurrentStream();
    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [playCurrentStream, stream]);

  return (
    <>
      <video
        ref={ref}
        data-testid={label === "Ваше видео" ? "local-video" : "remote-video"}
        aria-label={label}
        autoPlay
        playsInline
        muted={muted}
        onLoadedMetadata={playCurrentStream}
        onCanPlay={playCurrentStream}
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
