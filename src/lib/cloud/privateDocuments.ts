import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {and,eq} from 'drizzle-orm';
import {db} from '@/lib/db';
import {privateDocuments} from '@/lib/db/schema';
import {cloudScope} from './context';
function key(){const key=Buffer.from(process.env.SETTINGS_ENCRYPTION_KEY||'','base64');if(key.length!==32)throw new Error('Private settings encryption is not configured');return key;}
export async function readPrivateDocument<T>(id:string):Promise<T|null>{const row=(await db.select().from(privateDocuments).where(and(eq(privateDocuments.id,id),eq(privateDocuments.ownerId,cloudScope().user.id))))[0];if(!row)return null;const [iv,tag,payload]=row.ciphertext.split('.').map(v=>Buffer.from(v,'base64'));const decipher=createDecipheriv('aes-256-gcm',key(),iv);decipher.setAuthTag(tag);return JSON.parse(Buffer.concat([decipher.update(payload),decipher.final()]).toString()) as T;}
export async function writePrivateDocument(id:string,data:unknown){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(),iv),payload=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);const ciphertext=[iv,cipher.getAuthTag(),payload].map(v=>v.toString('base64')).join('.');await db.insert(privateDocuments).values({id,ownerId:cloudScope().user.id,ciphertext,updatedAt:new Date().toISOString()}).onConflictDoUpdate({target:[privateDocuments.id,privateDocuments.ownerId],set:{ciphertext,updatedAt:new Date().toISOString()}});}
