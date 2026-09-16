'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSession, destroySession, hashPassword, invitationHash, requireUser, verifyPassword } from '@/lib/auth';
import { pool, query } from '@/lib/db';
import { requireProject, requireTask, requireWorkspace } from '@/lib/access';

const value = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const must = (form: FormData, key: string, max = 200) => { const v = value(form,key); if (!v || v.length > max) throw new Error(`Invalid ${key}.`); return v; };
const oneOf = (v: string, choices: string[]) => { if (!choices.includes(v)) throw new Error('Invalid value.'); return v; };
const refresh = () => revalidatePath('/', 'layout');

export async function signUp(form: FormData) {
  const name = must(form,'name',100), email = must(form,'email',320).toLowerCase(), password = must(form,'password',200);
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8) throw new Error('Use a valid email and a password of at least 8 characters.');
  const rows = await query<{id:string}>('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id',[name,email,hashPassword(password)]);
  await createSession(rows[0].id);
  redirect('/');
}
export async function signIn(form: FormData) {
  const email = value(form,'email').toLowerCase(), password = value(form,'password');
  const rows = await query<{id:string;password_hash:string}>('SELECT id,password_hash FROM users WHERE email=$1',[email]);
  if (!rows[0] || !verifyPassword(password,rows[0].password_hash)) throw new Error('Incorrect email or password.');
  await createSession(rows[0].id);
  redirect('/');
}
export async function signOut() { await destroySession(); redirect('/login'); }

export async function createWorkspace(form: FormData) {
  const user = await requireUser(), name = must(form,'name',100);
  const client = await pool.connect(); let id = '';
  try { await client.query('BEGIN');
    const r = await client.query<{id:string}>('INSERT INTO workspaces(name) VALUES($1) RETURNING id',[name]); id = r.rows[0].id;
    await client.query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,\'owner\')',[id,user.id]);
    await client.query('COMMIT');
  } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  refresh(); redirect(`/w/${id}`);
}
export async function updateWorkspace(form: FormData) {
  const user = await requireUser(), id = must(form,'workspaceId');
  await requireWorkspace(id,user.id,'admin');
  await query('UPDATE workspaces SET name=$2,icon=$3,color=$4,default_view=$5 WHERE id=$1',[id,must(form,'name',100),value(form,'icon').slice(0,8)||'◈',value(form,'color')||'#6d5efc',oneOf(value(form,'defaultView'),['board','list'])]);
  refresh();
}
export async function deleteWorkspace(form: FormData) {
  const user = await requireUser(), id = must(form,'workspaceId');
  await requireWorkspace(id,user.id,'owner');
  await query('DELETE FROM workspaces WHERE id=$1',[id]); refresh(); redirect('/');
}
export async function inviteMember(form: FormData) {
  const user = await requireUser(), workspaceId = must(form,'workspaceId');
  await requireWorkspace(workspaceId,user.id,'admin');
  const email = must(form,'email',320).toLowerCase(), role = oneOf(value(form,'role'),['admin','member','viewer']);
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Invalid email.');
  const existing = await query<{id:string}>('SELECT id FROM users WHERE email=$1',[email]);
  if (existing[0]) {
    await query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT (workspace_id,user_id) DO UPDATE SET role=EXCLUDED.role',[workspaceId,existing[0].id,role]);
    await query('INSERT INTO notifications(user_id,type,message) VALUES($1,\'invite\',$2)',[existing[0].id,'You were added to a workspace.']);
  } else {
    const token = randomBytes(24).toString('hex');
    await query('INSERT INTO invitations(workspace_id,email,role,token_hash,invited_by,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval \'7 days\')',[workspaceId,email,role,invitationHash(token),user.id]);
    refresh(); redirect(`/w/${workspaceId}/settings?invite=${token}`);
  }
  refresh();
}
export async function acceptInvitation(token: string) {
  const user = await requireUser();
  const rows = await query<{id:string;workspace_id:string;email:string;role:string}>('SELECT id,workspace_id,email,role FROM invitations WHERE token_hash=$1 AND accepted_at IS NULL AND expires_at>now()',[invitationHash(token)]);
  const invite = rows[0];
  if (!invite || invite.email !== user.email) throw new Error('This invitation is invalid or belongs to another email.');
  await query('INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT (workspace_id,user_id) DO NOTHING',[invite.workspace_id,user.id,invite.role]);
  await query('UPDATE invitations SET accepted_at=now() WHERE id=$1',[invite.id]);
  refresh(); redirect(`/w/${invite.workspace_id}`);
}
export async function changeMemberRole(form: FormData) {
  const user = await requireUser(), workspaceId = must(form,'workspaceId'), targetId = must(form,'userId');
  await requireWorkspace(workspaceId,user.id,'owner');
  if (targetId === user.id) throw new Error('You cannot change your own owner role.');
  const role = oneOf(value(form,'role'),['admin','member','viewer']);
  await query('UPDATE workspace_members SET role=$3 WHERE workspace_id=$1 AND user_id=$2 AND role<>\'owner\'',[workspaceId,targetId,role]); refresh();
}
export async function removeMember(form: FormData) {
  const user = await requireUser(), workspaceId = must(form,'workspaceId'), targetId = must(form,'userId');
  await requireWorkspace(workspaceId,user.id,'admin');
  if (targetId === user.id) throw new Error('You cannot remove yourself here.');
  await query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role<>\'owner\'',[workspaceId,targetId]);
  await query('DELETE FROM project_members WHERE user_id=$2 AND project_id IN (SELECT id FROM projects WHERE workspace_id=$1)',[workspaceId,targetId]); refresh();
}
export async function createProject(form: FormData) {
  const user = await requireUser(), workspaceId = must(form,'workspaceId');
  await requireWorkspace(workspaceId,user.id,'edit');
  const rows = await query<{id:string}>('INSERT INTO projects(workspace_id,name,description,color) VALUES($1,$2,$3,$4) RETURNING id',[workspaceId,must(form,'name',100),value(form,'description').slice(0,2000),value(form,'color')||'#6d5efc']);
  await query('INSERT INTO project_members(project_id,user_id) VALUES($1,$2)',[rows[0].id,user.id]); refresh(); redirect(`/w/${workspaceId}/p/${rows[0].id}`);
}
export async function updateProject(form: FormData) {
  const user = await requireUser(), id = must(form,'projectId');
  await requireProject(id,user.id,'admin');
  await query('UPDATE projects SET name=$2,description=$3,color=$4,status=$5 WHERE id=$1',[id,must(form,'name',100),value(form,'description').slice(0,2000),value(form,'color')||'#6d5efc',oneOf(value(form,'status'),['active','archived'])]); refresh();
}
export async function deleteProject(form: FormData) {
  const user = await requireUser(), id = must(form,'projectId');
  const {workspaceId} = await requireProject(id,user.id,'admin');
  await query('DELETE FROM projects WHERE id=$1',[id]); refresh(); redirect(`/w/${workspaceId}`);
}
export async function toggleProjectMember(form: FormData) {
  const user = await requireUser(), projectId = must(form,'projectId'), targetId = must(form,'userId');
  const {workspaceId} = await requireProject(projectId,user.id,'admin');
  await requireWorkspace(workspaceId,targetId,'view');
  if (value(form,'mode') === 'add') await query('INSERT INTO project_members(project_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[projectId,targetId]);
  else await query('DELETE FROM project_members WHERE project_id=$1 AND user_id=$2',[projectId,targetId]);
  refresh();
}
export async function createLabel(form: FormData) {
  const user = await requireUser(), workspaceId = must(form,'workspaceId');
  await requireWorkspace(workspaceId,user.id,'edit');
  await query('INSERT INTO labels(workspace_id,name,color) VALUES($1,$2,$3) ON CONFLICT (workspace_id,name) DO NOTHING',[workspaceId,must(form,'name',40),value(form,'color')||'#6d5efc']); refresh();
}
export async function createTask(form: FormData) {
  const user = await requireUser(), projectId = must(form,'projectId');
  await requireProject(projectId,user.id,'edit');
  const title = must(form,'title',200);
  const rows = await query<{id:string}>('INSERT INTO tasks(project_id,title,status,priority,position) VALUES($1,$2,$3,$4,(SELECT count(*) FROM tasks WHERE project_id=$1)) RETURNING id',[projectId,title,oneOf(value(form,'status')||'todo',['todo','in_progress','review','done']),oneOf(value(form,'priority')||'medium',['low','medium','high','urgent'])]);
  await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'created\',$3)',[rows[0].id,user.id,`Created “${title}”`]); refresh();
}
export async function updateTask(form: FormData) {
  const user = await requireUser(), id = must(form,'taskId');
  const {workspaceId} = await requireTask(id,user.id,'edit');
  const assignee = value(form,'assigneeId') || null;
  if (assignee) await requireWorkspace(workspaceId,assignee,'view');
  const old = (await query<{status:string;assignee_id:string|null}>('SELECT status,assignee_id FROM tasks WHERE id=$1',[id]))[0];
  const status = oneOf(value(form,'status'),['todo','in_progress','review','done']);
  await query('UPDATE tasks SET title=$2,description=$3,status=$4,priority=$5,due_date=$6,assignee_id=$7,updated_at=now() WHERE id=$1',[id,must(form,'title',200),value(form,'description').slice(0,10000),status,oneOf(value(form,'priority'),['low','medium','high','urgent']),value(form,'dueDate')||null,assignee]);
  await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'updated\',$3)',[id,user.id,old.status !== status ? `Moved from ${old.status.replace('_',' ')} to ${status.replace('_',' ')}` : 'Updated task details']);
  if (assignee && assignee !== old.assignee_id) await query('INSERT INTO notifications(user_id,type,message,task_id) VALUES($1,\'assignment\',$2,$3)',[assignee,`You were assigned to “${value(form,'title')}”`,id]);
  refresh();
}
export async function moveTask(taskId: string, status: string) {
  const user = await requireUser(); await requireTask(taskId,user.id,'edit');
  oneOf(status,['todo','in_progress','review','done']);
  const old = (await query<{status:string}>('SELECT status FROM tasks WHERE id=$1',[taskId]))[0];
  if (old.status !== status) {
    await query('UPDATE tasks SET status=$2,updated_at=now() WHERE id=$1',[taskId,status]);
    await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'status\',$3)',[taskId,user.id,`Moved from ${old.status.replace('_',' ')} to ${status.replace('_',' ')}`]);
  }
  refresh();
}
export async function deleteTask(form: FormData) {
  const user = await requireUser(), id = must(form,'taskId'); await requireTask(id,user.id,'admin');
  await query('DELETE FROM tasks WHERE id=$1',[id]); refresh();
}
export async function addSubtask(form: FormData) {
  const user = await requireUser(), id = must(form,'taskId'); await requireTask(id,user.id,'edit');
  await query('INSERT INTO subtasks(task_id,title) VALUES($1,$2)',[id,must(form,'title',200)]);
  await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'subtask\',\'Added a checklist item\')',[id,user.id]); refresh();
}
export async function toggleSubtask(form: FormData) {
  const user = await requireUser(), id = must(form,'taskId'); await requireTask(id,user.id,'edit');
  await query('UPDATE subtasks SET is_complete=NOT is_complete WHERE id=$1 AND task_id=$2',[must(form,'subtaskId'),id]);
  await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'subtask\',\'Updated a checklist item\')',[id,user.id]); refresh();
}
export async function toggleTaskLabel(form: FormData) {
  const user = await requireUser(), id = must(form,'taskId');
  const {workspaceId} = await requireTask(id,user.id,'edit'), labelId = must(form,'labelId');
  const label = await query('SELECT 1 FROM labels WHERE id=$1 AND workspace_id=$2',[labelId,workspaceId]);
  if (!label.length) throw new Error('Label not found.');
  if (value(form,'mode') === 'add') await query('INSERT INTO task_labels(task_id,label_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,labelId]);
  else await query('DELETE FROM task_labels WHERE task_id=$1 AND label_id=$2',[id,labelId]);
  await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'label\',\'Updated labels\')',[id,user.id]); refresh();
}
export async function addComment(form: FormData) {
  const user = await requireUser(), id = must(form,'taskId');
  const {workspaceId} = await requireTask(id,user.id,'edit'), body = must(form,'text',5000);
  await query('INSERT INTO comments(task_id,user_id,text) VALUES($1,$2,$3)',[id,user.id,body]);
  await query('INSERT INTO activity_logs(task_id,user_id,action,details) VALUES($1,$2,\'comment\',\'Left a comment\')',[id,user.id]);
  const emails = [...new Set(body.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g) ?? [])];
  for (const email of emails) {
    const users = await query<{id:string}>('SELECT u.id FROM users u JOIN workspace_members wm ON wm.user_id=u.id WHERE wm.workspace_id=$1 AND u.email=$2',[workspaceId,email.toLowerCase()]);
    if (users[0] && users[0].id !== user.id) await query('INSERT INTO notifications(user_id,type,message,task_id) VALUES($1,\'mention\',$2,$3)',[users[0].id,`${user.name} mentioned you in a comment`,id]);
  }
  refresh();
}
export async function markNotificationRead(form: FormData) {
  const user = await requireUser();
  await query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2',[must(form,'notificationId'),user.id]); refresh();
}
