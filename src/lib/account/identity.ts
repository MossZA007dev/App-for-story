import {db} from '@/lib/db';
import {accountProfiles} from '@/lib/db/schema';
import {cloudScope} from '@/lib/cloud/context';
import {eq} from 'drizzle-orm';
export async function getCurrentAuthor(){const {user}=cloudScope();const row=(await db.select().from(accountProfiles).where(eq(accountProfiles.userId,user.id)))[0];return {id:user.id,name:row?.displayName||user.email?.split('@')[0]||'ผู้ร่วมเขียน',email:user.email||'',avatarUrl:row?.avatarPath?`/api/account/avatar?v=${encodeURIComponent(row.updatedAt)}`:''};}
