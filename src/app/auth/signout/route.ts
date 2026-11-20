import {NextRequest,NextResponse} from 'next/server';
import {authClient} from '@/lib/auth/server';
export async function POST(request:NextRequest){if(request.headers.get('origin')!==new URL(process.env.NEXT_PUBLIC_SITE_URL||request.url).origin)return NextResponse.json({error:'Forbidden'},{status:403});await (await authClient()).auth.signOut();return NextResponse.redirect(new URL('/login',request.url),303);}
