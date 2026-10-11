/**
 * Audio helpers for Story Forge
 * Supports YouTube background playback, direct MP3/WAV links, and audio streams.
 */

export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Standard YouTube watch URL: https://www.youtube.com/watch?v=s7L2PVdrb_8
  // Short URL: https://youtu.be/s7L2PVdrb_8
  // Embed URL: https://www.youtube.com/embed/s7L2PVdrb_8
  // Mobile: https://m.youtube.com/watch?v=s7L2PVdrb_8
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  // YouTube Shorts: https://www.youtube.com/shorts/s7L2PVdrb_8
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return shortsMatch[1];
  }

  return null;
}

export function isDirectAudioUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.endsWith(".mp3") ||
    clean.endsWith(".wav") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".m4a") ||
    clean.endsWith(".aac") ||
    clean.endsWith(".flac") ||
    clean.startsWith("/api/audio/") ||
    clean.startsWith("blob:") ||
    clean.startsWith("data:audio")
  );
}

export function getAudioSourceType(url: string | null | undefined): "youtube" | "direct" | "custom_url" | "empty" {
  if (!url || !url.trim()) return "empty";
  if (extractYouTubeVideoId(url)) return "youtube";
  if (isDirectAudioUrl(url)) return "direct";
  return "custom_url";
}
