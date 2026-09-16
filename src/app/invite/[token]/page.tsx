import { acceptInvitation } from '@/app/actions';
export default async function InvitationPage({params}:{params:Promise<{token:string}>}) { const {token}=await params; await acceptInvitation(token); return null; }
