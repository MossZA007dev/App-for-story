import {config} from 'dotenv';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {postgresConnectionOptions} from '../../src/lib/cloud/postgres';
config({path:'.env.local',quiet:true});
async function main(){
 const root='/Users/moss/App-for-story/data/audio';const names=readdirSync(root).filter(name=>!name.startsWith('.')&&/\.(mp3|wav|m4a|ogg|flac|webm)$/i.test(name)&&statSync(join(root,name)).isFile());
 if(!process.argv.includes('--apply')){console.log(JSON.stringify({dryRun:true,audioFiles:names.length,bytes:names.reduce((n,f)=>n+statSync(join(root,f)).size,0)}));return;}
 if(!process.env.SUPABASE_MIGRATION_SECRET_KEY)throw new Error('Migration credential required');
 const exported=JSON.parse(readFileSync('/private/tmp/saga-cloud-migration-20261120/export.json','utf8'));
 const db=new Client(postgresConnectionOptions());const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_MIGRATION_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});await db.connect();
 try{
 const {rows}=await db.query('SELECT DISTINCT owner_id FROM projects WHERE id=ANY($1::text[])',[exported.data.projects.map((p:{id:string})=>p.id)]);if(rows.length!==1)throw new Error('Owner mismatch');const owner=rows[0].owner_id;
 for(const name of names){const bytes=readFileSync(join(root,name));if(bytes.length>52428800)throw new Error('Oversized audio');const path=`${owner}/audio/${name}`,contentType=name.endsWith('.mp3')?'audio/mpeg':'application/octet-stream';const result=await admin.storage.from('story-media').upload(path,bytes,{contentType,upsert:false});if(result.error&&Number((result.error as unknown as {statusCode:string}).statusCode)!==409)throw new Error('Upload failed');const downloaded=await admin.storage.from('story-media').download(path);if(!downloaded.data||createHash('sha256').update(Buffer.from(await downloaded.data.arrayBuffer())).digest('hex')!==createHash('sha256').update(bytes).digest('hex'))throw new Error('Audio checksum mismatch');
 const existing=await db.query('SELECT owner_id,storage_path FROM media_assets WHERE id=$1',[name]);if(existing.rows.length&&(existing.rows[0].owner_id!==owner||existing.rows[0].storage_path!==path))throw new Error('Asset ownership mismatch');await db.query('INSERT INTO media_assets(id,owner_id,kind,storage_path,content_type,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[name,owner,'audio',path,contentType,new Date().toISOString()]);
 }
 console.log(JSON.stringify({importedAudioFiles:names.length,allChecksumsVerified:true,ownerOnlyUntilAttached:true,sourceUnchanged:true}));
 }finally{await db.end();}
}
main().catch(()=>{console.error('Audio migration incomplete; source unchanged.');process.exitCode=1;});
