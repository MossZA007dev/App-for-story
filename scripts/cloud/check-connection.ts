import {config} from 'dotenv';
import {Client} from 'pg';
import {postgresConnectionOptions} from '../../src/lib/cloud/postgres';
config({path:'.env.local',quiet:true});

async function main(){
 const client=new Client(postgresConnectionOptions());
 try{
  await client.connect();
  const {rows}=await client.query(`SELECT true AS connected,
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public') AS public_tables,
    (SELECT count(*)::int FROM auth.users) AS accounts`);
  console.log(JSON.stringify(rows[0]));
 }finally{await client.end();}
}
main().catch((error:unknown)=>{
 const code=error&&typeof error==='object'&&'code' in error?String(error.code):'CONNECTION_ERROR';
 console.error(JSON.stringify({connected:false,code}));
 process.exitCode=1;
});
