import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/auth/server';
export async function GET(request:NextRequest){const code=request.nextUrl.searchParams.get('code');if(code){const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(request.nextUrl.searchParams.get('next')==='/account/password'?'/account/password':'/sagas',request.url));}return NextResponse.redirect(new URL('/login?error=confirmation',request.url));}
