import 'server-only';
import { notFound } from 'next/navigation';
import { workspaceContext } from './workspace';
import { query } from './db';

export async function projectContext(workspaceId: string, projectId: string) {
  const context = await workspaceContext(workspaceId);
  const [project] = await query<{id:string;name:string;description:string;color:string;status:string}>(
    'SELECT id,name,description,color,status FROM projects WHERE id=$1 AND workspace_id=$2', [projectId, workspaceId]);
  if (!project) notFound();
  const members = await query<{id:string;name:string}>(
    'SELECT u.id,u.name FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=$1 ORDER BY u.name', [projectId]);
  const canAdmin = context.role === 'owner' || context.role === 'admin';
  const canEdit = canAdmin || (context.role === 'member' && members.some(m => m.id === context.user.id));
  return {...context, project, members, canAdmin, canEdit};
}
