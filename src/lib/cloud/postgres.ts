import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

/** Explicit TLS options take precedence over potentially weaker URI defaults. */
export function postgresConnectionOptions(){
 const raw=process.env.DATABASE_URL;
 if(!raw)throw new Error('DATABASE_URL is not configured.');
 const uri=new URL(raw);
 for(const option of ['sslmode','sslcert','sslkey','sslrootcert'])uri.searchParams.delete(option);
 const ca=process.env.SUPABASE_CA_CERT||readFileSync(resolve(process.env.SUPABASE_CA_CERT_PATH||'.supabase-ca.crt'),'utf8');
 return {connectionString:uri.toString(),ssl:{ca,rejectUnauthorized:true},connectionTimeoutMillis:15000};
}
