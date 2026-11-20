import {withServerAccount} from '@/lib/auth/account';
import {getAccountData} from '@/lib/account/data';
import {AccountDashboard} from '@/components/account/AccountDashboard';
export default async function AccountPage(){const data=await withServerAccount(getAccountData);return <AccountDashboard initialData={data}/>;}
