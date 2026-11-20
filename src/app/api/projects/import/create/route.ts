import {withAccount} from "@/lib/auth/account";
import { NextRequest, NextResponse } from "next/server";
import { CreateStoryImportSchema, createImportedStory } from "@/lib/story/createImportedStory";

export async function POST(request: NextRequest) {
return withAccount(request, async () => {
  try {
    const parsed=CreateStoryImportSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({error:parsed.error.issues[0]?.message || "ข้อมูลนำเข้าไม่ถูกต้อง"},{status:400});
    const result=await createImportedStory(parsed.data);
    return NextResponse.json({success:true,...result},{status:result.reused ? 200:201});
  } catch {
    return NextResponse.json({error:"สร้างเรื่องไม่สำเร็จ ระบบยกเลิกการสร้างชุดนี้แล้ว กรุณาลองอีกครั้ง"},{status:500});
  }

});
}
