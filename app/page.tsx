'use client'
import React, { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type RGB = { r: number; g: number; b: number };

const DEFAULT_PINK: RGB = { r: 255, g: 105, b: 180 }; 
const DEFAULT_GREEN: RGB = { r: 1, g: 110, b: 60 }; 
const MAX_RENDER_DIMENSION = 2000;

export default function DuotoneConverter() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const [filename, setFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [intensity, setIntensity] = useState<number>(1); 
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const [highlightColor] = useState<RGB>(DEFAULT_PINK);
  const [shadowColor] = useState<RGB>(DEFAULT_GREEN);

  const clamp = (v: number, a = 0, b = 255) => Math.max(a, Math.min(b, v));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const applyDuotoneToImage = useCallback(() => {
    const img = originalImageRef.current;
    if (!img) return;

    setLoading(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let targetW = img.naturalWidth;
      let targetH = img.naturalHeight;
      if (Math.max(targetW, targetH) > MAX_RENDER_DIMENSION) {
        const scale = MAX_RENDER_DIMENSION / Math.max(targetW, targetH);
        targetW = Math.round(targetW * scale);
        targetH = Math.round(targetH * scale);
      }

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const t = lum / 255;

        const rr = Math.round(lerp(shadowColor.r, highlightColor.r, t) * intensity + r * (1 - intensity));
        const gg = Math.round(lerp(shadowColor.g, highlightColor.g, t) * intensity + g * (1 - intensity));
        const bb = Math.round(lerp(shadowColor.b, highlightColor.b, t) * intensity + b * (1 - intensity));

        data[i] = clamp(rr);
        data[i + 1] = clamp(gg);
        data[i + 2] = clamp(bb);
      }

      ctx.putImageData(imageData, 0, 0);
    } finally {
      setLoading(false);
    }
  }, [highlightColor, shadowColor, intensity]);

  const loadImage = useCallback((f: File) => {
    setFilename(f.name);
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      setImageSrc(url);
      applyDuotoneToImage();
    };
    img.onerror = () => {
      setImageSrc(null);
    };
    img.src = url;
  }, [applyDuotoneToImage]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    loadImage(f);
  }, [loadImage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const f = e.dataTransfer?.files?.[0];
      if (f && f.type.startsWith("image/")) {
        loadImage(f);
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = "copy";
    };

    container.addEventListener("drop", onDrop);
    container.addEventListener("dragover", onDragOver);

    return () => {
      container.removeEventListener("drop", onDrop);
      container.removeEventListener("dragover", onDragOver);
    };
  }, [loadImage]);

  useEffect(() => {
    applyDuotoneToImage();
  }, [intensity, applyDuotoneToImage]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const timestamp = 
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    const link = document.createElement("a");
    link.download = `${timestamp}-chromavive.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleReset = useCallback(() => {
    setImageSrc(null);
    setFilename(null);
    setNaturalSize(null);
    originalImageRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Duotone — Brave Pink ↔ Hero Green</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Unggah gambar (klik atau seret & lepas)</Label>

              <div
                ref={containerRef}
                className="border-dashed border-2 rounded-lg p-3 flex flex-col items-center justify-center gap-3 text-center cursor-pointer hover:bg-muted/5"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') fileInputRef.current?.click(); }}
              >
                <div className="text-sm">Klik di sini atau seret gambar ke area ini</div>
                <div className="text-xs text-muted-foreground">
                  Maks dimensi render: {MAX_RENDER_DIMENSION}px (otomatis diskalakan)
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex gap-2 mt-2 w-full justify-center">
                  <Button onClick={() => fileInputRef.current?.click()}>Pilih File</Button>
                  <Button variant="ghost" onClick={handleReset}>Reset</Button>
                </div>

                {filename && (
                  <div className="mt-2 text-sm truncate w-full px-2">{filename}</div>
                )}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <Label>Intensity: {Math.round(intensity * 100)}%</Label>
                  <Slider
                    value={[intensity * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val) => setIntensity(val[0] / 100)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleDownload} disabled={!imageSrc || loading}>Download</Button>
                  <Button
                    variant="outline"
                    onClick={() => applyDuotoneToImage()}
                    disabled={!imageSrc || loading}
                  >
                    Apply
                  </Button>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div
                    className="w-8 h-8 rounded-md ring-1 ring-muted-foreground"
                    style={{ background: `rgb(${shadowColor.r}, ${shadowColor.g}, ${shadowColor.b})` }}
                  />
                  <div className="text-sm">Hero Green (shadow)</div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div
                    className="w-8 h-8 rounded-md ring-1 ring-muted-foreground"
                    style={{ background: `rgb(${highlightColor.r}, ${highlightColor.g}, ${highlightColor.b})` }}
                  />
                  <div className="text-sm">Brave Pink (highlight)</div>
                </div>

                {loading && <div className="text-sm text-muted-foreground">Memproses gambar...</div>}
              </div>
            </div>

            <div>
              <div className="border rounded-md overflow-hidden bg-black/5 flex items-center justify-center h-64 md:h-[480px]">
                <canvas ref={canvasRef} className="w-full h-auto block max-h-full object-contain" />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Preview responsif — gambar diskalakan untuk kenyamanan tampilan. Untuk hasil resolusi penuh, download hasilnya.
                {naturalSize && (
                  <div className="mt-1">Ukuran asli: {naturalSize.w}×{naturalSize.h}px</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
