import {withServerAccount} from '@/lib/auth/account';
import {UpdatePassword} from '@/components/account/UpdatePassword';
export default async function PasswordPage(){await withServerAccount(async()=>true);return <UpdatePassword/>;}
