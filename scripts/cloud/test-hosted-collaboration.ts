import {config} from 'dotenv';
import {createClient} from '@supabase/supabase-js';
import {createServerClient,serializeCookieHeader} from '@supabase/ssr';
import {Client} from 'pg';
import {randomUUID,randomBytes} from 'node:crypto';
import {postgresConnectionOptions} from '../../src/lib/cloud/postgres';
config({path:'.env.local',quiet:true});
const origin='https://saga-forge-nine.vercel.app';
let step='initialization';
async function main(){
 const admin=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_MIGRATION_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const db=new Client(postgresConnectionOptions());await db.connect();const users:string[]=[];let projectId='',avatarPath='';
 const check=(ok:unknown)=>{if(!ok)throw new Error('CHECK_FAILED');};
 async function account(){const suffix=randomUUID(),email=`saga-automated-${suffix}@example.com`,password=randomBytes(24).toString('base64url');const created=await admin.auth.admin.createUser({email,password,email_confirm:true});check(!created.error&&created.data.user);users.push(created.data.user!.id);const jar=new Map<string,string>();const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:items=>items.forEach(i=>jar.set(i.name,i.value))},auth:{autoRefreshToken:false}});const logged=await client.auth.signInWithPassword({email,password});check(!logged.error&&logged.data.session);return {id:created.data.user!.id,client,async request(path:string,method='GET',body?:unknown){const headers:Record<string,string>={Origin:origin,Cookie:[...jar].map(([name,value])=>serializeCookieHeader(name,value,{}).split(';')[0]).join('; ')};if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const response=await fetch(origin+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,redirect:'manual'});return {status:response.status,data:await response.json().catch(()=>null)};}};}
 try{
  step='create isolated test accounts';const a=await account(),b=await account();
  step='new accounts see no existing owner stories';let r=await a.request('/api/projects');check(r.status===200&&Array.isArray(r.data)&&r.data.length===0);
  step='create disposable story';r=await a.request('/api/projects','POST',{title:'Automated collaboration verification',universe:'test'});check(r.status===200&&r.data.projectId);projectId=r.data.projectId;
  step='nonmember cannot read';check((await b.request(`/api/projects/${projectId}`)).status===404);
  step='create editor invitation';r=await a.request(`/api/projects/${projectId}/access`,'POST',{role:'editor'});check(r.status===200&&r.data.url);const token=new URLSearchParams(new URL(r.data.url).hash.slice(1)).get('token');
  step='accept invitation';r=await b.request('/api/invitations/accept','POST',{token});check(r.status===200&&r.data.projectId===projectId);
  step='editor reads shared story';r=await b.request(`/api/projects/${projectId}`);check(r.status===200&&r.data.parts?.length);const partId=r.data.parts[0].id;
  step='editor creates scene';r=await b.request(`/api/projects/${projectId}/parts/${partId}/scenes`,'POST',{title:'Disposable test scene',contentMarkdown:'baseline'});check(r.status===200&&r.data.scene?.id);const sceneId=r.data.scene.id,version=r.data.scene.version;
  step='first editor saves';r=await a.request(`/api/projects/${projectId}/scenes/${sceneId}`,'PUT',{contentMarkdown:'writer A',expectedVersion:version});check(r.status===200);const newVersion=r.data.scene.version;
  step='stale editor is rejected';check((await b.request(`/api/projects/${projectId}/scenes/${sceneId}`,'PUT',{contentMarkdown:'writer B',expectedVersion:version})).status===409);
  step='first manuscript preserved';r=await b.request(`/api/projects/${projectId}/scenes/${sceneId}`);check(r.status===200&&r.data.scene.contentMarkdown==='writer A');
  step='downgrade to reader';check((await a.request(`/api/projects/${projectId}/access`,'PATCH',{userId:b.id,role:'reader'})).status===200);
  step='reader cannot edit';check((await b.request(`/api/projects/${projectId}/scenes/${sceneId}`,'PUT',{contentMarkdown:'forbidden',expectedVersion:newVersion})).status===403);
  step='reader may bookmark and save progress';check((await b.request('/api/account/bookmarks','PUT',{projectId,sceneId,blockIndex:0})).status===200);check((await b.request(`/api/projects/${projectId}/reading-progress`,'PUT',{sceneId,blockIndex:0})).status===200);
  step='bookmarks remain private';r=await a.request('/api/account/bookmarks');check(r.status===200&&r.data.length===0);
  step='profile upload';const form=new FormData();form.append('avatar',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aomkAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'test.png');check((await a.request('/api/account/avatar','POST',form)).status===200);
  avatarPath=(await db.query('SELECT avatar_path FROM account_profiles WHERE user_id=$1',[a.id])).rows[0]?.avatar_path;check(avatarPath);
  step='avatar storage is private';const denied=await b.client.storage.from('account-avatars').download(avatarPath);check(denied.error);
  step='AI settings are private and encrypted';check((await a.request('/api/openai-story/settings','POST',{apiKey:'sk-test-value-never-used-for-generation',model:'gpt-5.4-mini'})).status===200);r=await b.request('/api/openai-story/settings');check(r.status===200&&r.data.configured===false);const cipher=(await db.query('SELECT ciphertext FROM private_documents WHERE owner_id=$1 AND id=$2',[a.id,'openai-story'])).rows[0]?.ciphertext;check(cipher&&!cipher.includes('sk-test-value'));
  step='revoke member';check((await a.request(`/api/projects/${projectId}/access`,'DELETE',{userId:b.id})).status===200);check((await b.request(`/api/projects/${projectId}`)).status===404);
  console.log('PASS: hosted login, owner isolation, invitations, editor writes, 409 conflicts, reader restrictions, private bookmarks/avatar/AI settings and membership revocation. Two disposable test accounts; no generation or emails.');
 }finally{
  if(avatarPath)await admin.storage.from('account-avatars').remove([avatarPath]);
  if(projectId)await db.query('DELETE FROM projects WHERE id=$1 AND owner_id=ANY($2::uuid[])',[projectId,users]);
  if(users.length){for(const table of ['private_documents','app_settings','media_assets'])await db.query(`DELETE FROM ${table} WHERE owner_id=ANY($1::uuid[])`,[users]);for(const id of users)await admin.auth.admin.deleteUser(id);}
  await db.end();
 }
}
main().catch(()=>{console.error(JSON.stringify({hostedTestPassed:false,step,temporaryDataCleanupAttempted:true}));process.exitCode=1;});
