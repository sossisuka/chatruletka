"use client";

import { useEffect, useRef } from "react";

const NOISE_WIDTH = 320;
const NOISE_HEIGHT = 240;
const FRAME_INTERVAL = 1000 / 24;

export function NoiseCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });

    if (!canvas || !context) return;

    const image = context.createImageData(NOISE_WIDTH, NOISE_HEIGHT);
    const pixels = image.data;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;
    let lastFrame = -FRAME_INTERVAL;
    let noiseSeed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

    const drawNoise = () => {
      for (let index = 0; index < pixels.length; index += 4) {
        noiseSeed ^= noiseSeed << 13;
        noiseSeed ^= noiseSeed >>> 17;
        noiseSeed ^= noiseSeed << 5;
        noiseSeed >>>= 0;

        const first = noiseSeed & 0xff;
        const second = (noiseSeed >>> 8) & 0xff;
        const third = (noiseSeed >>> 16) & 0xff;
        const edge = noiseSeed >>> 24;
        let shade = 10 + Math.floor(((first + second + third) * 72) / 765);

        if (edge === 0) shade = 9;
        if (edge === 0xff) shade = 99;

        pixels[index] = shade;
        pixels[index + 1] = shade;
        pixels[index + 2] = shade;
        pixels[index + 3] = 255;
      }

      context.putImageData(image, 0, 0);
    };

    const animate = (time: number) => {
      if (time - lastFrame >= FRAME_INTERVAL) {
        drawNoise();
        lastFrame = time;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    drawNoise();

    if (!motionQuery.matches) {
      animationFrame = window.requestAnimationFrame(animate);
    }

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="remote-noise"
      width={NOISE_WIDTH}
      height={NOISE_HEIGHT}
      aria-hidden="true"
    />
  );
}
