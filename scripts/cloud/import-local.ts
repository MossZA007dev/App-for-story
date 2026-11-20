import {config} from 'dotenv';
import {Client} from 'pg';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {postgresConnectionOptions} from '../../src/lib/cloud/postgres';
config({path:'.env.local',quiet:true});
const tables=['projects','characters','abilities','parts','episodes','scenes','scene_versions','relationships','change_logs','continuity_ledgers','images','collaborators','sound_effects'];
type Row=Record<string,unknown>;type Asset={kind:string;filename:string;sourcePath:string;bytes:number;sha256:string};
const source=process.argv.find(a=>a.startsWith('--source='))?.slice(9);
const apply=process.argv.includes('--apply');
async function main(){
 if(!source)throw Object.assign(new Error(),{code:'SOURCE_REQUIRED'});
 const imported=JSON.parse(readFileSync(source,'utf8')) as {format:string;data:Record<string,Row[]>;assets:Asset[];narrations:{projectId:string;sceneId:string;manifest:unknown}[]};
 if(imported.format!=='saga-cloud-v1'||Object.keys(imported.data).some(t=>!tables.includes(t)))throw Object.assign(new Error(),{code:'INVALID_EXPORT'});
 for(const asset of imported.assets){if(createHash('sha256').update(readFileSync(asset.sourcePath)).digest('hex')!==asset.sha256)throw Object.assign(new Error(),{code:'SOURCE_ASSET_CHANGED'});}
 if(!apply){console.log(JSON.stringify({dryRun:true,counts:Object.fromEntries(tables.map(t=>[t,imported.data[t].length])),assets:imported.assets.length}));return;}
 if(!process.env.SUPABASE_MIGRATION_SECRET_KEY)throw Object.assign(new Error(),{code:'MIGRATION_KEY_REQUIRED'});
 const client=new Client(postgresConnectionOptions()),admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_MIGRATION_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 await client.connect();
 try{
 const users=await client.query('SELECT id FROM auth.users');if(users.rows.length!==1)throw Object.assign(new Error(),{code:'OWNER_SELECTION_REQUIRED'});const owner=users.rows[0].id;
 const existing=await client.query('SELECT id,owner_id FROM public.projects');const plannedIds=new Set(imported.data.projects.map(p=>p.id));if(existing.rows.some(p=>!plannedIds.has(p.id)||p.owner_id!==owner))throw Object.assign(new Error(),{code:'EXISTING_CLOUD_DATA_REQUIRES_REVIEW'});
 const existingIds=new Set(existing.rows.map(p=>p.id));
 const partProject=new Map(imported.data.parts.map(p=>[p.id,p.project_id]));const sceneProject=new Map(imported.data.scenes.map(s=>[s.id,partProject.get(s.part_id)]));const charProject=new Map(imported.data.characters.map(c=>[c.id,c.project_id]));
 const grants=new Map<string,Set<string>>();
 const paths=new Map<string,Asset>();for(const a of imported.assets)paths.set(a.kind+'/'+a.filename,a);
 const referenced=(value:unknown):Set<string>=>{const result=new Set<string>();function walk(v:unknown){if(typeof v==='string'){for(const [key,a]of paths)if(v.includes(a.filename)||v.includes(encodeURIComponent(a.filename)))result.add(key);}else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk);}walk(value);return result;};
 for(const table of tables)for(const row of imported.data[table]){const project=String(row.project_id||(table==='projects'?row.id:null)||partProject.get(row.part_id)||sceneProject.get(row.scene_id)||charProject.get(row.character_id)||'');if(!project)continue;for(const key of referenced(row)){if(!grants.has(key))grants.set(key,new Set());grants.get(key)!.add(project);}}
 function normalized(value:unknown){if(typeof value!=='string')return value;return value.replace(/(?:[A-Za-z]:)?[^\s"'<>]*?(?:\/data\/(images|audio)\/)([^\s"'<>?#\\]+)/g,(_all,kind,name)=>`/api/${kind}/${name}`);}
 let completed=0;
 for(let start=0;start<imported.assets.length;start+=4){await Promise.all(imported.assets.slice(start,start+4).map(async asset=>{
  const storagePath=`${owner}/${asset.kind}/${asset.filename}`,buffer=readFileSync(asset.sourcePath);const ext=asset.filename.split('.').pop()?.toLowerCase();const contentType=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4'} as Record<string,string>)[ext||'']||'application/octet-stream';
  const {error}=await admin.storage.from('story-media').upload(storagePath,buffer,{contentType,upsert:false});if(error&&Number((error as unknown as {statusCode?:string}).statusCode)!==409)throw Object.assign(new Error(),{code:'MEDIA_UPLOAD_FAILED'});
  const downloaded=await admin.storage.from('story-media').download(storagePath);if(downloaded.error||!downloaded.data||createHash('sha256').update(Buffer.from(await downloaded.data.arrayBuffer())).digest('hex')!==asset.sha256)throw Object.assign(new Error(),{code:'MEDIA_VERIFICATION_FAILED'});
  completed++;
 }));if(completed%20===0||completed===imported.assets.length)console.log(JSON.stringify({verifiedMedia:completed,total:imported.assets.length}));}
 await client.query('BEGIN');
 await client.query("SELECT pg_advisory_xact_lock(hashtext('saga-forge-import'))");
 for(const table of tables){const columns=(await client.query('SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['public',table])).rows.map(r=>r.column_name);let rows=imported.data[table];
  if(existingIds.size)rows=rows.filter(row=>{const p=row.project_id||(table==='projects'?row.id:null)||partProject.get(row.part_id)||sceneProject.get(row.scene_id)||charProject.get(row.character_id);return !existingIds.has(p);});
  for(let start=0;start<rows.length;start+=15){const batch=rows.slice(start,start+15);const names=columns.filter(name=>name==='owner_id'&&table==='projects'||batch.some(row=>Object.hasOwn(row,name)));if(!batch.length)continue;
   const values:unknown[]=[];const tuple=batch.map(row=>'('+names.map(name=>{let value=table==='projects'&&name==='owner_id'?owner:row[name];if(name==='share_code')value='';if(['file_path','avatar_url','cover_image','bgm_url','dialogue_bindings','url','metadata'].includes(name))value=normalized(value);values.push(value??null);return '$'+values.length;}).join(',')+')');await client.query(`INSERT INTO public."${table}" (${names.map(n=>'"'+n+'"').join(',')}) VALUES ${tuple.join(',')}`,values);
  }
 }
 for(const asset of imported.assets){const storagePath=`${owner}/${asset.kind}/${asset.filename}`;await client.query('INSERT INTO public.media_assets(id,owner_id,kind,storage_path,content_type,created_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING',[asset.filename,owner,asset.kind,storagePath,'application/octet-stream',new Date().toISOString()]);for(const project of grants.get(asset.kind+'/'+asset.filename)||[])await client.query('INSERT INTO public.media_asset_projects(asset_id,project_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[asset.filename,project]);}
 for(const n of imported.narrations)await client.query('INSERT INTO public.scene_narrations(scene_id,project_id,manifest,updated_at) VALUES($1,$2,$3,$4) ON CONFLICT(scene_id) DO NOTHING',[n.sceneId,n.projectId,JSON.stringify(n.manifest),new Date().toISOString()]);
 for(const row of imported.data.scenes){const result=await client.query('SELECT content_markdown FROM public.scenes WHERE id=$1',[row.id]);if(result.rows[0]?.content_markdown!==row.content_markdown)throw Object.assign(new Error(),{code:'MANUSCRIPT_MISMATCH'});}
 for(const table of tables){const count=await client.query(`SELECT count(*)::int AS count FROM public."${table}"`);if(count.rows[0].count!==imported.data[table].length)throw Object.assign(new Error(),{code:'COUNT_MISMATCH'});}
 await client.query('COMMIT');
 console.log(JSON.stringify({imported:true,verifiedManuscripts:imported.data.scenes.length,verifiedMedia:completed,sourceUnchanged:true}));
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{await client.end();}
}
main().catch(error=>{console.error(JSON.stringify({imported:false,code:error.code||'IMPORT_FAILED'}));process.exitCode=1;});
