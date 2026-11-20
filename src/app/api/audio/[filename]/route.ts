import {withAccount} from '@/lib/auth/account';
import {mediaDownloadUrl} from '@/lib/storage';
export async function GET(request:Request,{params}:{params:Promise<{filename:string}>}){return withAccount(request,async()=>{
 const {filename}=await params;
 try{const url=await mediaDownloadUrl(filename,'audio');return url?new Response(null,{status:307,headers:{Location:url}}):new Response(null,{status:404});}catch{return new Response(null,{status:404});}
});}
