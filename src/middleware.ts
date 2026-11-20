import {sessionCookieOptions} from '@/lib/auth/sessionCookies';
import {createServerClient} from '@supabase/ssr';
import {NextRequest,NextResponse} from 'next/server';
export async function middleware(request:NextRequest){
 const pathname=request.nextUrl.pathname;
 if(pathname.startsWith('/api/'))return NextResponse.next(); // Every API method has its own authenticated RLS boundary.
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 const publicPage=pathname==='/join'||pathname==='/login'||pathname==='/setup'||pathname.startsWith('/auth/');
 if(!url||!key||!process.env.DATABASE_URL)return publicPage?NextResponse.next():NextResponse.redirect(new URL('/setup',request.url));
 let response=NextResponse.next({request});
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll:items=>{items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,sessionCookieOptions(options,request.cookies.get('saga-remember')?.value!=='0')));}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user&&!publicPage){const target=new URL('/login',request.url);target.searchParams.set('next',pathname);const login=NextResponse.redirect(target);response.cookies.getAll().forEach(c=>login.cookies.set(c));return login;}
 response.headers.set('Cache-Control','private, no-store');return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)']};
