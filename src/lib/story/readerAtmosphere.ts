export type AtmosphereKind='none'|'rain'|'wind'|'fire'|'train';
export const ATMOSPHERES:{value:AtmosphereKind;label:string;description:string}[]=[
 {value:'none',label:'ไม่มีเสียงบรรยากาศ',description:'เลือกเสียงด้วยตัวเองได้'},
 {value:'rain',label:'ฝนโปรย',description:'เสียงฝนต่อเนื่องนุ่ม ๆ'},
 {value:'wind',label:'สายลม',description:'เสียงลมกว้างและเบา'},
 {value:'fire',label:'เตาผิง',description:'เสียงไฟอุ่น ๆ ไม่ใส่เสียงแตกดัง'},
 {value:'train',label:'รถไฟ',description:'เสียงวิ่งและจังหวะล้อเบา ๆ'},
];
/** Explicit setting cues only; unknown settings remain silent. No future passages. */
export function inferAtmosphere(location:string,title:string):AtmosphereKind {
 const text=`${location} ${title}`;
 if(/รถไฟ|\b(?:train|express|railway|railroad)\b/i.test(text))return 'train';
 if(/ฝน|พายุฝน|\brain(?:y|fall)?\b/i.test(text))return 'rain';
 if(/เตาผิง|กองไฟ|แคมป์ไฟ|\b(?:fireplace|campfire|hearth)\b/i.test(text))return 'fire';
 if(/ลมแรง|ยอดเขา|ชายฝั่ง|ทะเลทราย|พายุหิมะ|\b(?:wind|mountain|coast|desert|blizzard)\b/i.test(text))return 'wind';
 return 'none';
}
