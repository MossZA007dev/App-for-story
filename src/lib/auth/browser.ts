import {createBrowserClient,parseCookieHeader,serializeCookieHeader} from '@supabase/ssr';
export function browserAuth(remember=true){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!url||!key)throw new Error('Cloud is not configured');
 document.cookie=serializeCookieHeader('saga-remember',remember?'1':'0',{path:'/',sameSite:'lax',maxAge:34560000,secure:location.protocol==='https:'});
 return createBrowserClient(url,key,{isSingleton:false,cookies:{getAll:()=>parseCookieHeader(document.cookie).map(c=>({name:c.name,value:c.value||''})),setAll:items=>{for(const {name,value,options} of items){const sessionOnly=!remember&&options.maxAge!==0;document.cookie=serializeCookieHeader(name,value,sessionOnly?{...options,maxAge:undefined,expires:undefined}:options);}}}});
}
