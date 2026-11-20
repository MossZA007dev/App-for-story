const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',C='00000000-0000-4000-8000-000000000003';
 await db.exec(`CREATE ROLE authenticated NOLOGIN; CREATE ROLE anon NOLOGIN; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; GRANT USAGE ON SCHEMA public,auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
 await db.exec(`CREATE TABLE auth.users(id uuid PRIMARY KEY,email text); INSERT INTO auth.users(id) VALUES('${A}'),('${B}'),('${C}'); CREATE SCHEMA storage; CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); CREATE TABLE storage.objects(id text PRIMARY KEY,bucket_id text,name text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT USAGE ON SCHEMA storage TO authenticated; GRANT SELECT,INSERT,DELETE ON storage.objects TO authenticated; CREATE FUNCTION storage.foldername(text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array($1,'/') $$;`);
 await db.exec(fs.readFileSync('supabase/migrations/generated/0000_safe_secret_warriors.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/0002_account_security.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/0003_private_storage.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/0004_account_features.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/0005_collaboration.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/0006_member_profiles.sql','utf8'));
 await db.exec(`INSERT INTO projects(id,owner_id,title,universe,story_rules,created_at,updated_at) VALUES('a','${A}','A','test','','now','now'),('b','${B}','B','test','','now','now'); INSERT INTO project_members(id,project_id,user_id,role,created_at) VALUES('reader','a','${B}','reader','now'),('editor','a','${C}','editor','now'); INSERT INTO parts(id,project_id,number,title,created_at,updated_at) VALUES('part-a','a',1,'A','now','now'),('part-b','b',1,'B','now','now');`);
 async function account(id,run){await db.exec('BEGIN');try{await db.exec('SET LOCAL ROLE authenticated');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[id]);await run();}finally{await db.exec('ROLLBACK');}}
 await account(A,async()=>{assert.deepEqual((await db.query('SELECT id FROM projects ORDER BY id')).rows,[{id:'a'}]); assert.deepEqual((await db.query('SELECT id FROM parts ORDER BY id')).rows,[{id:'part-a'}]);assert.equal((await db.query("DELETE FROM projects WHERE id='b' RETURNING id")).rows.length,0);});
 await account(B,async()=>{assert.equal((await db.query('SELECT id FROM projects')).rows.length,2);assert.equal((await db.query("UPDATE parts SET title='forbidden' WHERE id='part-a' RETURNING id")).rows.length,0);});
 await account(C,async()=>{assert.equal((await db.query("UPDATE parts SET title='edited' WHERE id='part-a' RETURNING id")).rows.length,1);assert.equal((await db.query("DELETE FROM projects WHERE id='a' RETURNING id")).rows.length,0);assert.equal((await db.query("DELETE FROM project_members WHERE id='reader' RETURNING id")).rows.length,0);});
 await account(A,async()=>{await db.query("INSERT INTO app_settings(id,updated_at) VALUES('default','now')");assert.equal((await db.query('SELECT owner_id FROM app_settings')).rows[0].owner_id,A);});
 await db.exec(`INSERT INTO private_documents(id,owner_id,ciphertext,updated_at) VALUES('key','${A}','encrypted','now');`);
 await account(B,async()=>assert.equal((await db.query('SELECT * FROM private_documents')).rows.length,0));
 await db.exec(`INSERT INTO scenes(id,part_id,title,"order",content_markdown,created_at,updated_at) VALUES('scene-a','part-a','Scene A',1,'hello','now','now'),('scene-b','part-b','Scene B',1,'private','now','now'); INSERT INTO account_profiles(user_id,display_name,updated_at) VALUES('${A}','A','now'); INSERT INTO bookmarks(id,user_id,project_id,scene_id,block_index,created_at) VALUES('bookmark-a','${A}','a','scene-a',3,'now'); INSERT INTO reading_progress(project_id,user_id,scene_id,block_index,updated_at) VALUES('a','${A}','scene-a',3,'now'); INSERT INTO storage.objects(id,bucket_id,name) VALUES('avatar-a','account-avatars','${A}/avatar.jpg');`);
 await account(A,async()=>{assert.equal((await db.query('SELECT * FROM account_profiles')).rows.length,1);assert.equal((await db.query('SELECT * FROM bookmarks')).rows.length,1);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1);assert.equal((await db.query('SELECT block_index FROM reading_progress')).rows[0].block_index,3);});
 await account(B,async()=>{assert.equal((await db.query('SELECT * FROM bookmarks')).rows.length,0);assert.equal((await db.query('SELECT * FROM account_profiles')).rows.length,0);assert.equal((await db.query('SELECT * FROM reading_progress')).rows.length,0);assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0);assert.equal((await db.query("DELETE FROM bookmarks WHERE id='bookmark-a' RETURNING id")).rows.length,0);});
 await account(B,async()=>{await db.query("INSERT INTO bookmarks(id,project_id,scene_id,block_index,created_at) VALUES('own','a','scene-a',4,'now')");assert.equal((await db.query('SELECT user_id FROM bookmarks')).rows[0].user_id,B);});
 async function denied(id,query){let rejected=false;try{await account(id,()=>db.exec(query));}catch(e){assert.equal(e.code,'42501');rejected=true;}assert.ok(rejected);}
 await denied(A,"INSERT INTO bookmarks(id,project_id,scene_id,created_at) VALUES('invalid','a','scene-b','now')");
 await denied(B,`INSERT INTO account_profiles(user_id,display_name,updated_at) VALUES('${A}','spoof','now')`);
 await denied(B,`INSERT INTO storage.objects(id,bucket_id,name) VALUES('attack','account-avatars','${A}/spoof.jpg')`);
 console.log('PASS: profiles, bookmarks, progress and avatar storage are private per account; readers can bookmark; cross-project scenes and spoofed avatar paths rejected.');
 await db.exec(`INSERT INTO project_invitations(id,project_id,token_hash,role,created_by,expires_at) VALUES('inv-reader','a','hash-reader','reader','${A}',now()+interval '1 day'),('inv-used','a','hash-used','reader','${A}',now()+interval '1 day'),('inv-expired','a','hash-expired','editor','${A}',now()-interval '1 day');`);
 await account(C,async()=>{const accepted=await db.query("SELECT public.accept_story_invitation('hash-reader') AS id");assert.equal(accepted.rows[0].id,'a');assert.equal((await db.query("SELECT public.accept_story_invitation('hash-reader') AS id")).rows[0].id,'a');assert.equal((await db.query('SELECT * FROM project_invitations')).rows.length,0);});
 // Rollback each check means fixture invitations remain unconsumed between accounts.
 await db.exec(`UPDATE project_invitations SET accepted_by='${C}' WHERE id='inv-used'`);
 async function unavailable(id,hash){let denied=false;try{await account(id,()=>db.query('SELECT public.accept_story_invitation($1)',[hash]));}catch{denied=true;}assert.ok(denied);}
 await unavailable(B,'hash-used');await unavailable(B,'hash-expired');await unavailable(B,'not-a-token');
 await db.exec("UPDATE project_invitations SET revoked=true WHERE id='inv-reader'");await unavailable(C,'hash-reader');
 await account(A,async()=>{assert.equal((await db.query("SELECT * FROM public.story_members('a')")).rows.length,2);});
 await unavailable(B,'hash-reader');
 console.log('PASS: single-account invites, idempotent acceptance, expiry, revocation and private membership controls.');
 await db.exec(`INSERT INTO media_assets(id,owner_id,kind,storage_path,content_type,created_at) VALUES('audio-owned','${A}','audio','${A}/audio/test.mp3','audio/mpeg','now')`);
 await account(B,async()=>assert.equal((await db.query("SELECT id FROM media_assets WHERE id='audio-owned'")).rows.length,0));
 await db.exec("INSERT INTO media_asset_projects(asset_id,project_id) VALUES('audio-owned','a')");
 await account(B,async()=>assert.equal((await db.query("SELECT id FROM media_assets WHERE id='audio-owned'")).rows.length,1));
 await denied(B,"INSERT INTO media_asset_projects(asset_id,project_id) VALUES('audio-owned','b')");
 console.log('PASS: unattached audio stays owner-only; attachment grants story readers access without allowing redistribution by another account.');
 await db.exec(`INSERT INTO account_profiles(user_id,display_name,avatar_path,updated_at) VALUES('${B}','Real friend','${B}/profile.jpg','now'); INSERT INTO storage.objects(id,bucket_id,name) VALUES('avatar-b','account-avatars','${B}/profile.jpg');`);
 await account(A,async()=>{const result=await db.query("SELECT * FROM public.story_members('a') WHERE user_id=$1",[B]);assert.equal(result.rows[0].display_name,'Real friend');assert.equal(result.rows[0].has_avatar,true);assert.equal((await db.query("SELECT public.story_member_avatar('a',$1) AS path",[B])).rows[0].path,B+'/profile.jpg');assert.equal((await db.query("SELECT id FROM storage.objects WHERE id='avatar-b'")).rows.length,1);});
 let deniedMemberLookup=false;try{await account(C,()=>db.query("SELECT * FROM public.story_members('a')"));}catch{deniedMemberLookup=true;}assert.ok(deniedMemberLookup);
 await db.exec("DELETE FROM project_members WHERE id='reader'");
 await account(A,async()=>{assert.equal((await db.query("SELECT public.story_member_avatar('a',$1) AS path",[B])).rows[0].path,null);assert.equal((await db.query("SELECT id FROM storage.objects WHERE id='avatar-b'")).rows.length,0);});
 console.log('PASS: member names/avatars come from real accepted account profiles; non-owners cannot enumerate profiles; removal revokes avatar access.');
 await db.close();console.log('PASS: PostgreSQL policies, owner isolation, reader/editor permissions, owner-only membership, private account settings. Local disposable database only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
