import {withAccount} from "@/lib/auth/account";
import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {readerAISettings,saveReaderAIKey,FREE_READER_MODEL} from '@/lib/ai/freeReaderAI';
export const dynamic='force-dynamic';
export async function GET(accountRequest: Request){
return withAccount(accountRequest, async () => {return NextResponse.json({configured:!!(await readerAISettings()).apiKey,model:FREE_READER_MODEL},{headers:{'Cache-Control':'no-store'}});
});
}
export async function POST(req:NextRequest){
return withAccount(req, async () => {
 const input=z.object({apiKey:z.string().trim().min(10).max(1000).regex(/^[\x21-\x7E]+$/)}).safeParse(await req.json().catch(()=>null));
 if(!input.success)return NextResponse.json({error:'กรุณากรอก OpenRouter API Key ที่ถูกต้อง'},{status:400});
 try {await saveReaderAIKey(input.data.apiKey);return NextResponse.json({configured:true,model:FREE_READER_MODEL});}
 catch{return NextResponse.json({error:'บันทึกการตั้งค่าไม่สำเร็จ'},{status:500});}

});
}
