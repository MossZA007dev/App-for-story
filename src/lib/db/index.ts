import {Pool} from 'pg';
import {drizzle,type NodePgDatabase} from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import {cloudScope} from '@/lib/cloud/context';
import {postgresConnectionOptions} from '@/lib/cloud/postgres';
let system:NodePgDatabase<typeof schema>|undefined;
export function systemDatabase(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured.');
 if(!system)system=drizzle(new Pool({...postgresConnectionOptions(),max:4}),{schema});
 return system;
}
// A request may only query through its authenticated, RLS-enabled transaction.
export const db=new Proxy({} as NodePgDatabase<typeof schema>,{get(_target,property){const current=cloudScope().db;const value=Reflect.get(current,property);return typeof value==='function'?value.bind(current):value;}});
