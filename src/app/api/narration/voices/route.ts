import {withAccount} from "@/lib/auth/account";
import { NextResponse } from "next/server";
import {getElevenKey,subscription,stockVoices,modelRate,NarrationError} from "@/lib/audio/elevenlabs";
export const dynamic="force-dynamic";
export async function GET(accountRequest: Request) {
return withAccount(accountRequest, async () => {
  const key=await getElevenKey();
  if(!key) return NextResponse.json({configured:false,voices:[]});
  try {
    const [quota,voices,rate]=await Promise.all([subscription(key),stockVoices(key),modelRate(key)]);
    return NextResponse.json({configured:true,voices,quota,rate},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {return NextResponse.json({error:error instanceof NarrationError ? error.message:"โหลดข้อมูล ElevenLabs ไม่สำเร็จ"},{status:400});}

});
}
