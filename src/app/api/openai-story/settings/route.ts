import {withAccount} from "@/lib/auth/account";
import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {openAIStorySettings,saveOpenAIStorySettings} from "@/lib/ai/openaiStory";
export const dynamic="force-dynamic";
export async function GET(accountRequest: Request){
return withAccount(accountRequest, async () => {const settings=await openAIStorySettings();return NextResponse.json({configured:Boolean(settings.apiKey),model:settings.model},{headers:{"Cache-Control":"no-store"}});
});
}
export async function POST(request:NextRequest){
return withAccount(request, async () => {
 const input=z.object({apiKey:z.string().trim().min(10).max(1000).regex(/^[\x21-\x7E]+$/).optional(),model:z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9._:-]+$/)}).safeParse(await request.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:"ตรวจ API Key และชื่อโมเดลก่อนบันทึก"},{status:400});
 try{await saveOpenAIStorySettings(input.data);return NextResponse.json({configured:Boolean((await openAIStorySettings()).apiKey),model:input.data.model});}
 catch{return NextResponse.json({error:"บันทึกการตั้งค่า OpenAI ไม่สำเร็จ"},{status:500});}

});
}
