import 'server-only';
import { requireUser } from './auth';
import { query } from './db';
import { requireWorkspace } from './access';
import { notFound } from 'next/navigation';

export async function workspaceContext(id: string) {
  const user = await requireUser();
  const role = await requireWorkspace(id,user.id);
  const workspaces = await query<{id:string;name:string;icon:string;color:string;role:string}>(`SELECT w.id,w.name,w.icon,w.color,wm.role FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE wm.user_id=$1 ORDER BY w.created_at DESC`,[user.id]);
  const workspace = await query<{id:string;name:string;icon:string;color:string;default_view:string;created_at:Date}>('SELECT * FROM workspaces WHERE id=$1',[id]);
  if (!workspace[0]) notFound();
  return {user,role,workspaces,workspace:workspace[0]};
}
