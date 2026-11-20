import Image from 'next/image';
/** Official supplied artwork, including its wordmark and transparent background. */
export function BrandLogo({className='',priority=false}:{className?:string;priority?:boolean}){
 return <Image src="/brand/saga-forge-logo.png" alt="Saga Forge" width={768} height={576} sizes="(max-width: 680px) 104px, 180px" priority={priority} className={`saga-brand-logo ${className}`}/>;
}
