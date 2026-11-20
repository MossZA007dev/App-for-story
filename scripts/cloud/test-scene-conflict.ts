import {config} from 'dotenv';
import {Client} from 'pg';
import {drizzle} from 'drizzle-orm/node-postgres';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {postgresConnectionOptions} from '../../src/lib/cloud/postgres';
import {withCloudScope,type CloudScope} from '../../src/lib/cloud/context';
import {lockSceneForWrite,SceneWriteError} from '../../src/lib/story/sceneWriteGuard';
import * as schema from '../../src/lib/db/schema';
config({path:'.env.local',quiet:true});
async function main(){
 const control=new Client(postgresConnectionOptions()),a=new Client(postgresConnectionOptions()),b=new Client(postgresConnectionOptions());await Promise.all([control.connect(),a.connect(),b.connect()]);const projectId='test-conflict-'+randomUUID(),partId=randomUUID(),sceneId=randomUUID();
 try{
  const {rows}=await control.query('SELECT id FROM auth.users LIMIT 1');const user={id:rows[0].id};
  await control.query("INSERT INTO projects(id,owner_id,title,universe,story_rules,created_at,updated_at) VALUES($1,$2,'Temporary concurrent-write verification','test','','now','now')",[projectId,user.id]);
  await control.query("INSERT INTO parts(id,project_id,number,title,created_at,updated_at) VALUES($1,$2,1,'test','now','now')",[partId,projectId]);
  await control.query('INSERT INTO scenes(id,part_id,"order",title,content_markdown,version,created_at,updated_at) VALUES($1,$2,1,$3,$4,1,$5,$5)',[sceneId,partId,'test','baseline','now']);
  for(const c of [a,b]){await c.query('BEGIN');await c.query('SET LOCAL ROLE authenticated');await c.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[user.id]);}
  function scope(c:Client):CloudScope{return {db:drizzle(c,{schema}),user,supabase:{} as CloudScope['supabase'],projectId};}
  await withCloudScope(scope(a),()=>lockSceneForWrite(projectId,sceneId,1,true));
  let finished=false;const second=withCloudScope(scope(b),()=>lockSceneForWrite(projectId,sceneId,1,true)).then(()=>{finished=true;return null;},e=>{finished=true;return e;});
  await control.query('SELECT pg_sleep(0.15)');assert.equal(finished,false,'second writer must wait on row lock');
  await a.query('UPDATE scenes SET content_markdown=$1,version=2 WHERE id=$2',['writer A',sceneId]);await a.query('COMMIT');const conflict=await second;assert.ok(conflict instanceof SceneWriteError);assert.equal(conflict.status,409);await b.query('ROLLBACK');
  const saved=await control.query('SELECT content_markdown FROM scenes WHERE id=$1',[sceneId]);assert.equal(saved.rows[0].content_markdown,'writer A');console.log('PASS: two real PostgreSQL connections; second writer waits, then receives 409; first manuscript remains intact. Disposable test project only.');
 }finally{await a.query('ROLLBACK').catch(()=>{});await b.query('ROLLBACK').catch(()=>{});await control.query('DELETE FROM projects WHERE id=$1',[projectId]);await Promise.all([control.end(),a.end(),b.end()]);}
}
main().catch(()=>{console.error('Concurrent-write verification failed; temporary project cleaned up.');process.exitCode=1;});
