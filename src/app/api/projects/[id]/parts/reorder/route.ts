import {withAccount} from '@/lib/auth/account';
import {getManagedParts,reorderStoryParts,PartOrderError} from '@/lib/story/manageStoryParts';
import {z} from 'zod';
const input=z.object({partIds:z.array(z.string().min(1).max(128)).min(1).max(1000),expectedOrder:z.array(z.string().min(1).max(128)).min(1).max(1000)}).strict();
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return withAccount(request,async()=>Response.json({parts:await getManagedParts((await params).id)}));}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){return withAccount(request,async()=>{const body=input.safeParse(await request.json().catch(()=>null));if(!body.success)return Response.json({error:'รายการภาคไม่ถูกต้อง'},{status:400});const {id}=await params;try{await reorderStoryParts(id,body.data.partIds,body.data.expectedOrder);return Response.json({parts:await getManagedParts(id)});}catch(e){return Response.json({error:e instanceof PartOrderError?e.message:'บันทึกลำดับไม่สำเร็จ กรุณาลองใหม่'},{status:e instanceof PartOrderError?e.status:500});}});}
