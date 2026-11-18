/** Decode complete SSE events; never interpret a provider error as manuscript text. */
export async function readStoryStream(body:ReadableStream<Uint8Array>,onText:(text:string)=>void=()=>{}) {
  const reader=body.getReader(),decoder=new TextDecoder();let pending="",text="",completed=false;
  const event=(frame:string)=>{
    const data=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data)return;
    if(data==='[DONE]'){completed=true;return;}
    let value:{text?:unknown;error?:unknown};
    try{value=JSON.parse(data);}catch{throw new Error('รูปแบบคำตอบ AI ไม่ถูกต้อง บทเดิมยังอยู่');}
    if(value.error)throw new Error('AI สร้างบทไม่สำเร็จ กรุณาตรวจโมเดลและ API Key ในการตั้งค่า บทเดิมยังอยู่');
    if(completed)return;
    if(typeof value.text==='string'){text+=value.text;onText(text);}
  };
  const consume=()=>{let position;while((position=pending.indexOf('\n\n'))>=0){event(pending.slice(0,position));pending=pending.slice(position+2);}};
  try{
    while(true){const {done,value}=await reader.read();if(done)break;pending+=(decoder.decode(value,{stream:true})).replace(/\r/g,'');consume();}
    pending+=decoder.decode();consume();if(pending.trim())event(pending);
    if(!completed || !text.trim())throw new Error('AI ส่งบทมาไม่ครบ จึงยังไม่แทนเนื้อหาเดิม');
    return text;
  }catch(error){await reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
}
