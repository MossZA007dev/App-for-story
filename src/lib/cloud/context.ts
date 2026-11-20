import {AsyncLocalStorage} from 'node:async_hooks';
import type {NodePgDatabase} from 'drizzle-orm/node-postgres';
import type {SupabaseClient,User} from '@supabase/supabase-js';
import type * as schema from '@/lib/db/schema';
export type CloudScope={db:NodePgDatabase<typeof schema>;user:Pick<User,'id'|'email'>;supabase:SupabaseClient;projectId?:string};
const context=new AsyncLocalStorage<CloudScope>();
export const withCloudScope=<T>(scope:CloudScope,run:()=>T)=>context.run(scope,run);
export function cloudScope(){const scope=context.getStore();if(!scope)throw new Error('An authenticated account context is required.');return scope;}
