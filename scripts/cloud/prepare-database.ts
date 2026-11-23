import {config} from 'dotenv';
import {Client} from 'pg';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {postgresConnectionOptions} from '../../src/lib/cloud/postgres';
config({path:'.env.local',quiet:true});

const files=[
 'supabase/migrations/generated/0000_safe_secret_warriors.sql',
 'supabase/migrations/0002_account_security.sql',
 'supabase/migrations/0003_private_storage.sql',
 'supabase/migrations/0004_account_features.sql',
 'supabase/migrations/0005_collaboration.sql',
 'supabase/migrations/0006_member_profiles.sql',
 'supabase/migrations/0007_season_music.sql',
];
async function main(){
 if(!process.argv.includes('--apply')){
  console.log('Dry run: prepares account-scoped tables and private storage; never imports or removes existing stories. Pass --apply after checking the connection.');
  return;
 }
 const client=new Client(postgresConnectionOptions());
 await client.connect();
 try{
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('saga-forge-cloud-migration'))");
  await client.query('CREATE SCHEMA IF NOT EXISTS saga_internal');
  await client.query('REVOKE ALL ON SCHEMA saga_internal FROM PUBLIC,anon,authenticated');
  await client.query('CREATE TABLE IF NOT EXISTS saga_internal.migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of files){
   const source=readFileSync(name,'utf8'),checksum=createHash('sha256').update(source).digest('hex');
   const previous=await client.query('SELECT checksum FROM saga_internal.migrations WHERE name=$1',[name]);
   if(previous.rows.length){
    if(previous.rows[0].checksum!==checksum)throw Object.assign(new Error('Migration changed'),{code:'MIGRATION_CHECKSUM_MISMATCH'});
    continue;
   }
   if(name===files[0]){
    const {rows}=await client.query("SELECT to_regclass('public.projects') AS existing");
    if(rows[0].existing)throw Object.assign(new Error('Existing tables require review'),{code:'EXISTING_TABLES_REQUIRE_REVIEW'});
   }
   await client.query('SET LOCAL search_path=public');
   await client.query(source);
   await client.query('INSERT INTO saga_internal.migrations(name,checksum) VALUES($1,$2)',[name,checksum]);
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({prepared:true,storiesImported:false}));
 }catch(error){await client.query('ROLLBACK');throw error;}
 finally{await client.end();}
}
main().catch((error:unknown)=>{
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'DATABASE_SETUP_ERROR';
 console.error(JSON.stringify({prepared:false,code}));process.exitCode=1;
});
