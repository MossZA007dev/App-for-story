export type MusicSetting = {bgmUrl?:string|null;bgmTitle?:string|null};
export type EpisodeMusic = MusicSetting & {bgmMode?:'inherit'|'custom'|'silent'|string};
export function resolveSceneMusic<T extends MusicSetting>(scene:T, part?:MusicSetting|null, episode?:EpisodeMusic|null) {
  const rawSceneBgmUrl=scene.bgmUrl||'',rawSceneBgmTitle=scene.bgmTitle||'';
  const base={...scene,rawSceneBgmUrl,rawSceneBgmTitle};
  if(rawSceneBgmUrl)return {...base,bgmSource:'scene' as const};
  if(episode?.bgmMode==='silent')return {...base,bgmUrl:'',bgmTitle:'',bgmSource:'silent' as const};
  if(episode?.bgmMode==='custom'&&episode.bgmUrl)return {...base,bgmUrl:episode.bgmUrl,bgmTitle:episode.bgmTitle||'เพลงเฉพาะ EP',bgmSource:'episode' as const};
  if(part?.bgmUrl)return {...base,bgmUrl:part.bgmUrl,bgmTitle:part.bgmTitle||'เพลงหลักประจำ SS',bgmSource:'season' as const};
  return {...base,bgmSource:'none' as const};
}
export const musicSourceLabel=(source?:string)=>({season:'ใช้เพลงหลักของ SS',episode:'ใช้เพลงเฉพาะ EP',scene:'ใช้เพลงเฉพาะฉาก',silent:'EP นี้ปิดเพลงพื้นหลัง',none:'ยังไม่ได้ตั้งเพลง'}[source||'none']||'เพลงประกอบ');
