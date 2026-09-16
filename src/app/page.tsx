import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { createWorkspace } from './actions';
import { AppShell } from '@/components/app-shell';
import { ArrowRight, FolderKanban, ListTodo, Plus, Sparkles } from 'lucide-react';

export default async function Home() {
  const user = await requireUser();
  const workspaces = await query<{id:string;name:string;icon:string;color:string;role:string;projects:string;tasks:string}>(`SELECT w.id,w.name,w.icon,w.color,wm.role,
    (SELECT count(*)::text FROM projects p WHERE p.workspace_id=w.id) projects,
    (SELECT count(*)::text FROM tasks t JOIN projects p ON p.id=t.project_id WHERE p.workspace_id=w.id) tasks
    FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id WHERE wm.user_id=$1 ORDER BY w.created_at DESC`,[user.id]);
  const assigned = await query<{id:string;title:string;status:string;priority:string;project_id:string;project_name:string;workspace_id:string}>(`SELECT t.id,t.title,t.status,t.priority,t.project_id,p.name project_name,p.workspace_id FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.assignee_id=$1 AND t.status<>'done' ORDER BY t.due_date NULLS LAST,t.created_at DESC LIMIT 5`,[user.id]);
  return <AppShell user={user} workspaces={workspaces}>
    <div className="page-header"><div><div className="eyebrow">OVERVIEW</div><h1>Good to see you, {user.name.split(' ')[0]} <span className="wave">✦</span></h1><p>One place for your team&apos;s work, from idea to done.</p></div></div>
    <div className="section-heading"><div><h2>Your workspaces</h2><p>Choose a space to get started.</p></div><span className="count-pill">{workspaces.length} total</span></div>
    <div className="workspace-grid">
      {workspaces.map(w=><Link className="workspace-card" href={`/w/${w.id}`} key={w.id}><span className="workspace-icon" style={{background:w.color}}>{w.icon}</span><div className="workspace-card-title">{w.name}<ArrowRight size={17}/></div><span className="muted">{w.role} · {w.projects} projects · {w.tasks} tasks</span></Link>)}
      <form action={createWorkspace} className="workspace-card create-card"><div className="create-symbol"><Plus size={20}/></div><label htmlFor="workspace-name">Create a workspace</label><div className="inline-form"><input id="workspace-name" name="name" placeholder="Workspace name" required maxLength={100}/><button className="icon-button primary" aria-label="Create workspace"><ArrowRight size={17}/></button></div></form>
    </div>
    <div className="section-heading top-gap"><div><h2>Assigned to you</h2><p>Keep the important things moving.</p></div></div>
    <div className="panel assigned-list">{assigned.length ? assigned.map(t=><Link key={t.id} href={`/w/${t.workspace_id}/p/${t.project_id}/t/${t.id}`} className="assigned-row"><span className="task-mark"><ListTodo size={17}/></span><span className="assigned-main"><strong>{t.title}</strong><small>{t.project_name}</small></span><span className={`priority ${t.priority}`}>{t.priority}</span><span className="status-tag">{t.status.replace('_',' ')}</span><ArrowRight size={16} className="row-arrow"/></Link>) : <div className="empty-state"><FolderKanban size={25}/><strong>All clear for now</strong><p>Tasks assigned to you will show up here.</p></div>}</div>
    <div className="hint"><Sparkles size={16}/> Create a workspace, add a project, then invite your team.</div>
  </AppShell>;
}
