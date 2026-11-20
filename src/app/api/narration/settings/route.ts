import {withAccount} from "@/lib/auth/account";
import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import {getElevenKey,saveElevenKey} from "@/lib/audio/elevenlabs";
export const dynamic="force-dynamic";
export async function GET(accountRequest: Request) {
return withAccount(accountRequest, async () => {return NextResponse.json({configured:Boolean(await getElevenKey())},{headers:{"Cache-Control":"no-store"}});
});
}
export async function POST(request:NextRequest) {
return withAccount(request, async () => {
  const data=z.object({apiKey:z.string().trim().min(10).max(500).regex(/^[\x21-\x7E]+$/)}).safeParse(await request.json().catch(()=>null));
  if(!data.success) return NextResponse.json({error:"กรอก ElevenLabs API Key ให้ครบก่อนบันทึก"},{status:400});
  try {await saveElevenKey(data.data.apiKey);return NextResponse.json({configured:true});}
  catch {return NextResponse.json({error:"บันทึกคีย์ไม่สำเร็จ กรุณาลองใหม่"},{status:500});}

});
}
