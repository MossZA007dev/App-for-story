import {createServerClient} from '@supabase/ssr';
import {sessionCookieOptions} from './sessionCookies';
import {cookies} from 'next/headers';
import {publicCloudConfig} from '@/lib/cloud/config';
export async function authClient(){
 const {url,key}=publicCloudConfig(),store=await cookies();
 return createServerClient(url,key,{cookies:{
  getAll:()=>store.getAll(),
  setAll:items=>{try{items.forEach(({name,value,options})=>store.set(name,value,sessionCookieOptions(options,store.get('saga-remember')?.value!=='0')));}catch{/* Middleware refreshes cookies for Server Components. */}}
 }});
}
