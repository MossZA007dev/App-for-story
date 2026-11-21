import {PGlite} from '@electric-sql/pglite';
import {drizzle} from 'drizzle-orm/pglite';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as schema from '../../src/lib/db/schema';
import {withCloudScope,type CloudScope} from '../../src/lib/cloud/context';
import {getManagedParts,reorderStoryParts} from '../../src/lib/story/manageStoryParts';
import {deleteStoryPart} from '../../src/lib/story/deleteStoryContent';
async function main(){const pg=new PGlite();try{
 const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',R='00000000-0000-4000-8000-000000000003',E='00000000-0000-4000-8000-000000000004';
 await pg.exec(`CREATE ROLE authenticated NOLOGIN;CREATE ROLE anon NOLOGIN;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth,public TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
 await pg.exec(readFileSync('supabase/migrations/generated/0000_safe_secret_warriors.sql','utf8'));await pg.exec(readFileSync('supabase/migrations/0002_account_security.sql','utf8'));
 await pg.exec(`INSERT INTO projects(id,owner_id,title,universe,story_rules,created_at,updated_at) VALUES('a','${A}','A','test','','now','now'),('b','${B}','B','test','','now','now');INSERT INTO project_members(id,project_id,user_id,role,created_at) VALUES('reader','a','${R}','reader','now'),('editor','a','${E}','editor','now');INSERT INTO parts(id,project_id,number,title,created_at,updated_at) VALUES('a1','a',1,'First','now','now'),('a2','a',2,'Second','now','now'),('a3','a',3,'Third','now','now'),('b1','b',1,'Other story','now','now');INSERT INTO episodes(id,project_id,part_id,number,title,created_at,updated_at) VALUES('ep2','a','a2',1,'ep','now','now');INSERT INTO scenes(id,part_id,episode_id,"order",title,content_markdown,created_at,updated_at) VALUES('s1','a1',null,1,'keep','unchanged first scene','now','now'),('s2','a2','ep2',1,'delete','second scene','now','now');INSERT INTO scene_versions(id,scene_id,version_number,title,content_markdown,created_at) VALUES('v2','s2',1,'original','original second scene','now');INSERT INTO images(id,project_id,scene_id,prompt,provider,file_path,kind,created_at) VALUES('img','a','s2','','upload','/api/images/test.png','scene','now');INSERT INTO characters(id,project_id,name,created_at,updated_at) VALUES('char','a','Actor','now','now');INSERT INTO abilities(id,character_id,name,gained_at_part,lost_at_part) VALUES('skill','char','Skill',1,2);`);
 const orm=drizzle(pg,{schema});
 async function account<T>(id:string,run:()=>Promise<T>){await pg.exec('SET ROLE authenticated');await pg.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[id]);return withCloudScope({db:orm as unknown as CloudScope['db'],user:{id},supabase:{} as CloudScope['supabase']},run);}
 await account(A,async()=>{
  let list=await getManagedParts('a');assert.equal(list[1].sceneCount,1);assert.equal(list[1].episodeCount,1);
  await reorderStoryParts('a',['a3','a1','a2'],['a1','a2','a3']);list=await getManagedParts('a');assert.deepEqual(list.map(p=>[p.id,p.number]),[['a3',1],['a1',2],['a2',3]]);
  const skill=(await pg.query('SELECT gained_at_part,lost_at_part FROM abilities WHERE id=$1',['skill'])).rows[0];assert.deepEqual(skill,{gained_at_part:2,lost_at_part:3});assert.equal((await pg.query<{content_markdown:string}>('SELECT content_markdown FROM scenes WHERE id=$1',['s1'])).rows[0].content_markdown,'unchanged first scene');
  await assert.rejects(()=>reorderStoryParts('a',['a1','a1','a2'],['a3','a1','a2']));await assert.rejects(()=>reorderStoryParts('a',['a3','b1','a2'],['a3','a1','a2']));await assert.rejects(()=>reorderStoryParts('a',['a1','a2'],['a3','a1','a2']));await assert.rejects(()=>reorderStoryParts('a',['a1','a2','a3'],['a1','a2','a3']));assert.deepEqual((await getManagedParts('a')).map(p=>p.id),['a3','a1','a2']);
  await assert.rejects(()=>deleteStoryPart('a','b1'));
  const stale=list.find(p=>p.id==='a2')!.snapshot;await pg.query("UPDATE scenes SET version=2,content_markdown='new edit',updated_at='later' WHERE id='s2'");await assert.rejects(()=>deleteStoryPart('a','a2',stale));assert.equal((await pg.query("SELECT id FROM scenes WHERE id='s2'")).rows.length,1);
  const fresh=(await getManagedParts('a')).find(p=>p.id==='a2')!;await deleteStoryPart('a','a2',fresh.snapshot);assert.equal((await pg.query("SELECT id FROM episodes WHERE id='ep2'")).rows.length,0);assert.equal((await pg.query("SELECT id FROM scene_versions WHERE scene_id='s2'")).rows.length,0);assert.equal((await pg.query<{scene_id:string|null}>("SELECT scene_id FROM images WHERE id='img'")).rows[0].scene_id,null);assert.equal((await pg.query("SELECT id FROM scenes WHERE id='s1'")).rows.length,1);
 });
 await account(R,async()=>{assert.equal((await getManagedParts('a')).length,2);await assert.rejects(()=>reorderStoryParts('a',['a1','a3'],['a3','a1']));await assert.rejects(()=>deleteStoryPart('a','a1'));});
 await account(E,async()=>{await reorderStoryParts('a',['a1','a3'],['a3','a1']);assert.deepEqual((await getManagedParts('a')).map(p=>p.id),['a1','a3']);});
 await account(A,async()=>{await deleteStoryPart('a','a3',(await getManagedParts('a')).find(p=>p.id==='a3')!.snapshot);const result=await deleteStoryPart('a','a1',(await getManagedParts('a'))[0].snapshot);assert.equal(result.nextPartId,'');assert.equal((await getManagedParts('a')).length,0);});
 await pg.exec('RESET ROLE');assert.equal((await pg.query("SELECT id FROM projects WHERE id='a'")).rows.length,1);assert.equal((await pg.query<{title:string}>("SELECT title FROM parts WHERE id='b1'")).rows[0].title,'Other story');
 console.log('PASS: real PostgreSQL ordering, complete-set validation, stale reorder/deletion rejection, ability-marker remapping, editor/reader boundaries, child cleanup, retained media, last-part deletion and other-story isolation. Disposable local database only.');
 }finally{await pg.close();}}
main().catch(e=>{console.error(e);process.exitCode=1;});
