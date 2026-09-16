import 'server-only';
import { query } from './db';

export type Role = 'owner' | 'admin' | 'member' | 'viewer';
export async function workspaceRole(workspaceId: string, userId: string): Promise<Role | null> {
  const rows = await query<{ role: Role }>('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [workspaceId,userId]);
  return rows[0]?.role ?? null;
}
export async function requireWorkspace(workspaceId: string, userId: string, needed: 'view'|'edit'|'admin'|'owner' = 'view') {
  const role = await workspaceRole(workspaceId,userId);
  if (!role || (needed === 'edit' && role === 'viewer') || (needed === 'admin' && !['admin','owner'].includes(role)) || (needed === 'owner' && role !== 'owner')) throw new Error('You do not have permission to do that.');
  return role;
}
export async function requireProject(projectId: string, userId: string, needed: 'view'|'edit'|'admin' = 'view') {
  const rows = await query<{workspace_id:string}>('SELECT workspace_id FROM projects WHERE id=$1',[projectId]);
  if (!rows[0]) throw new Error('Project not found.');
  const role = await requireWorkspace(rows[0].workspace_id,userId,needed);
  if (needed === 'edit' && role === 'member') {
    const member = await query('SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',[projectId,userId]);
    if (!member.length) throw new Error('You are not assigned to this project.');
  }
  return { workspaceId: rows[0].workspace_id, role };
}
export async function requireTask(taskId: string, userId: string, needed: 'view'|'edit'|'admin' = 'view') {
  const rows = await query<{project_id:string}>('SELECT project_id FROM tasks WHERE id=$1',[taskId]);
  if (!rows[0]) throw new Error('Task not found.');
  return { ...(await requireProject(rows[0].project_id,userId,needed)), projectId: rows[0].project_id };
}
