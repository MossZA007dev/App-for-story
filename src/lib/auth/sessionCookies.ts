export function sessionCookieOptions<T extends {maxAge?:number;expires?:Date}>(options:T,remember:boolean):T{
 return !remember&&options.maxAge!==0?{...options,maxAge:undefined,expires:undefined}:options;
}
