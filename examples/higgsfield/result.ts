/** Accept only an explicitly completed generation with a usable HTTPS video URL. */
export function completedVideoUrl(result: {status:string;video?:{url?:string}}): string {
  const status=result.status.toLowerCase();
  if(status==='failed') throw new Error('Generation failed. No completed video was returned.');
  if(status==='canceled' || status==='cancelled') throw new Error('Generation was canceled. No completed video was returned.');
  if(['nsfw','moderated','blocked','rejected'].includes(status)) throw new Error('Generation was blocked by moderation. No completed video was returned.');
  if(status!=='completed') throw new Error('Generation has not completed. Check the Higgsfield dashboard before submitting again.');
  let url:URL;
  try {url=new URL(result.video?.url || '');} catch {throw new Error('Completed response did not contain a valid video URL.');}
  if(url.protocol!=='https:') throw new Error('Completed response did not contain an HTTPS video URL.');
  return url.href;
}
