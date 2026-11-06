/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Upload, Video, X, Sparkles, Download, RefreshCw, AlertCircle, Play, Check } from 'lucide-react';

interface VideoAnimatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_IMAGES = [
  {
    name: 'Moss Island',
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_031618_8ce6dca1-972d-429d-8d13-bf0691c37848.png&w=800&q=80',
    prompt: 'Cinematic camera pushing forward over floating moss island into atmospheric mist',
  },
  {
    name: 'Sensor Mast',
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_025630_9a37a1e0-2547-4973-8160-c75205993914.png&w=800&q=80',
    prompt: 'Gentle breeze rippling moss and ferns around the field telemetry mast with floating cloud haze',
  },
  {
    name: 'Sky Haven',
    url: 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20261106_025545_b003e5cc-e68f-4fee-b686-c217a5d81eea.png&w=800&q=80',
    prompt: 'Slow cinematic orbit around the floating moss monolith through dense volumetric fog banks',
  },
];

const PRESET_PROMPTS = [
  'Cinematic forward push gliding over living moss and dewy ferns',
  'Gentle environmental breeze swaying flora with rolling misty fog',
  'Slow aerial ascent revealing distant floating stone monoliths',
  'Atmospheric time-lapse of morning mist parting across the canopy',
];

export const VideoAnimatorModal: React.FC<VideoAnimatorModalProps> = ({ isOpen, onClose }) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [prompt, setPrompt] = useState<string>('Cinematic forward push gliding over living moss and dewy ferns');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or WebP).');
      return;
    }

    setError(null);
    setMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = async (preset: typeof PRESET_IMAGES[0]) => {
    setError(null);
    setPrompt(preset.prompt);
    try {
      const response = await fetch(preset.url);
      const blob = await response.blob();
      setMimeType(blob.type || 'image/png');
      const reader = new FileReader();
      reader.onload = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(blob);
    } catch {
      setError('Could not load sample image. Please upload a local image file.');
    }
  };

  const handleGenerate = async () => {
    if (!imageBase64) {
      setError('Please upload an image or choose one of the sample frames first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setLoadingStage('Connecting to Gemini Interactions API (gemini-omni-1.2-flash)...');

    const stageTimer1 = setTimeout(() => {
      setLoadingStage('Analyzing image depth, texture layers, and atmosphere...');
    }, 4000);

    const stageTimer2 = setTimeout(() => {
      setLoadingStage('Synthesizing motion frames with Omni Flash video model...');
    }, 12000);

    const stageTimer3 = setTimeout(() => {
      setLoadingStage('Rendering lighting, fog dynamics, and particle vectors...');
    }, 24000);

    try {
      const res = await fetch('/api/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          prompt,
          aspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate video.');
      }

      if (!data.videoData) {
        throw new Error('No video data received from the server.');
      }

      // Convert base64 video to blob URL for smooth native playback
      const byteCharacters = atob(data.videoData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: data.mimeType || 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setGeneratedVideoUrl(url);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(
        err?.message ||
          'Failed to animate photo into video. Please check your Gemini API key and quota.'
      );
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setIsLoading(false);
      setLoadingStage('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="animator-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[var(--paper)] rounded-xl border border-[var(--ink)]/15 shadow-2xl text-[var(--ink)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ink)]/10 bg-[var(--mist)] sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="chip flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3 h-3 text-[var(--ink)]" />
              OMNI FLASH
            </span>
            <h2 id="animator-title" className="text-lg sm:text-xl font-semibold tracking-tight">
              Animate Photo to Video
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 text-[var(--ink)]/70 hover:text-[var(--ink)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Subtitle / Model Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-[var(--ink2)]/80 pb-2 border-b border-[var(--ink)]/10">
            <span>MODEL: GEMINI-OMNI-1.2-FLASH &bull; INTERACTIONS API</span>
            <span className="text-[11px] uppercase tracking-wider text-[var(--ink)]/60">
              CINEMATIC VIDEO SYNTHESIS
            </span>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-900 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Generation Notice</p>
                <p className="text-xs opacity-90 leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Dual Panel: Left = Source & Settings, Right = Preview/Result */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Image Input & Motion Controls */}
            <div className="space-y-5">
              {/* Image Input Section */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink2)] mb-2">
                  1. Source Ecological Photo
                </label>

                {imageBase64 ? (
                  <div className="relative rounded-lg overflow-hidden border border-[var(--ink)]/20 bg-black/5 group aspect-video flex items-center justify-center">
                    <img
                      src={imageBase64}
                      alt="Selected preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-[var(--ink)] text-xs font-mono uppercase rounded shadow hover:bg-[var(--lime)] transition-colors"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={() => setImageBase64(null)}
                        className="p-1.5 bg-red-600 text-white rounded shadow hover:bg-red-700 transition-colors"
                        aria-label="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[var(--ink)]/25 hover:border-[var(--lime2)] rounded-lg p-6 text-center cursor-pointer bg-white/40 hover:bg-white/70 transition-all flex flex-col items-center justify-center gap-2 group aspect-video"
                  >
                    <div className="w-10 h-10 rounded-full bg-[var(--lime)]/30 group-hover:bg-[var(--lime)] flex items-center justify-center text-[var(--ink)] transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--ink)]">
                        Click or drag a field photograph here
                      </p>
                      <p className="text-xs text-[var(--ink2)]/70 font-mono mt-1">
                        PNG, JPG, or WebP up to 20MB
                      </p>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />

                {/* Preset sample buttons */}
                <div className="mt-2.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink2)]/70 block mb-1.5">
                    Or select a Mossline landscape:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => handleSelectPreset(preset)}
                        className="px-2.5 py-1 text-xs font-mono rounded bg-white/70 hover:bg-[var(--lime)] border border-[var(--ink)]/15 text-[var(--ink)] transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Aspect Ratio Selection */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink2)] mb-2">
                  2. Video Aspect Ratio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                      aspectRatio === '16:9'
                        ? 'border-[var(--ink)] bg-[var(--lime)]/30 ring-1 ring-[var(--ink)]'
                        : 'border-[var(--ink)]/20 bg-white/50 hover:bg-white'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">16:9 Landscape</p>
                      <p className="text-[11px] font-mono text-[var(--ink2)]/80">Widescreen cinematic</p>
                    </div>
                    {aspectRatio === '16:9' && <Check className="w-4 h-4 text-[var(--ink)]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                      aspectRatio === '9:16'
                        ? 'border-[var(--ink)] bg-[var(--lime)]/30 ring-1 ring-[var(--ink)]'
                        : 'border-[var(--ink)]/20 bg-white/50 hover:bg-white'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-sm">9:16 Portrait</p>
                      <p className="text-[11px] font-mono text-[var(--ink2)]/80">Vertical mobile frame</p>
                    </div>
                    {aspectRatio === '9:16' && <Check className="w-4 h-4 text-[var(--ink)]" />}
                  </button>
                </div>
              </div>

              {/* Motion Prompt Section */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink2)] mb-2">
                  3. Camera & Atmosphere Motion Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--ink)]/20 bg-white/80 focus:outline-none focus:ring-2 focus:ring-[var(--lime2)] text-[var(--ink)] placeholder-[var(--ink)]/40 resize-none font-sans"
                  placeholder="Describe camera movement, wind, fog, or environmental dynamics..."
                />

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {PRESET_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(p)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/5 hover:bg-[var(--lime)] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors text-left"
                    >
                      + {p.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || !imageBase64}
                className="w-full py-3 px-4 rounded-lg bg-[var(--lime)] hover:bg-[var(--lime2)] text-[var(--ink)] font-semibold text-sm tracking-wide uppercase font-mono shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Video...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Generate Video via Gemini Omni Flash</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Output Video Display / Status */}
            <div className="flex flex-col">
              <label className="block text-xs font-mono uppercase tracking-wider text-[var(--ink2)] mb-2">
                Output Video Playback
              </label>

              <div
                className={`w-full flex-1 min-h-[300px] rounded-lg border border-[var(--ink)]/20 bg-black/90 flex flex-col items-center justify-center relative overflow-hidden ${
                  aspectRatio === '9:16' ? 'max-w-[320px] mx-auto aspect-[9/16]' : 'aspect-video'
                }`}
              >
                {isLoading ? (
                  <div className="p-6 text-center space-y-4 max-w-xs text-white">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-[var(--lime)]/20 animate-ping" />
                      <div className="w-16 h-16 rounded-full border-2 border-[var(--lime)] border-t-transparent animate-spin flex items-center justify-center">
                        <Video className="w-6 h-6 text-[var(--lime)]" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm tracking-wide">Generating Video</p>
                      <p className="text-xs text-[var(--lime)] font-mono mt-1 animate-pulse">
                        {loadingStage || 'Processing with Omni Flash...'}
                      </p>
                      <p className="text-[11px] text-white/50 font-mono mt-3">
                        Video generation typically takes 15–35 seconds.
                      </p>
                    </div>
                  </div>
                ) : generatedVideoUrl ? (
                  <div className="w-full h-full relative group">
                    <video
                      src={generatedVideoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={generatedVideoUrl}
                        download={`mossline-omni-${aspectRatio === '9:16' ? 'portrait' : 'landscape'}.mp4`}
                        className="px-3 py-1.5 rounded bg-[var(--lime)] text-[var(--ink)] text-xs font-mono font-medium flex items-center gap-1.5 shadow-lg hover:bg-[var(--lime2)] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download MP4
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 text-white/60 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-white/10 mx-auto flex items-center justify-center text-white/70">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                    <p className="text-xs font-mono uppercase tracking-wider text-white/80">
                      Video Ready Canvas
                    </p>
                    <p className="text-[11px] text-white/50 max-w-xs mx-auto">
                      Select or upload an image and press Generate Video to render cinematic motion with Gemini Omni Flash.
                    </p>
                  </div>
                )}
              </div>

              {generatedVideoUrl && (
                <div className="mt-3 flex items-center justify-between text-xs font-mono text-[var(--ink2)]">
                  <span className="flex items-center gap-1 text-green-700 font-semibold">
                    <Check className="w-3.5 h-3.5" /> Ready for preview & download
                  </span>
                  <a
                    href={generatedVideoUrl}
                    download={`mossline-omni-${Date.now()}.mp4`}
                    className="underline hover:text-[var(--ink)] flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Save to disk
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-[var(--ink)]/10 bg-[var(--mist)] text-[11px] font-mono text-[var(--ink2)]/80 flex flex-wrap items-center justify-between gap-2">
          <span>POWERED BY GOOGLE GENAI INTERACTIONS API</span>
          <span>ASPECT RATIOS: 16:9 LANDSCAPE / 9:16 PORTRAIT</span>
        </div>
      </div>
    </div>
  );
};
