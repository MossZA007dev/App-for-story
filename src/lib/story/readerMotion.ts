export type ReaderMotionPreference='system'|'on'|'off';
export function readerMotionPreference(saved:{motionMode?:unknown;motion?:unknown}):ReaderMotionPreference{
 if(saved.motionMode==='system'||saved.motionMode==='on'||saved.motionMode==='off')return saved.motionMode;
 return saved.motion===false?'off':'system';
}
export function readerMotionEnabled(preference:ReaderMotionPreference,reduced:boolean){return preference==='on'||(preference==='system'&&!reduced);}
