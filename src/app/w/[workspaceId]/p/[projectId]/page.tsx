import { DesktopObject } from '@/components/desktop-object';
import { DesktopFolder } from '@/components/desktop-folder';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { projectContext } from '@/lib/project';
import { query } from '@/lib/db';
import { createTask, updateProject } from '@/app/actions';

const columns = [{id:'todo',name:'To do',color:'slate'},{id:'in_progress',name:'In progress',color:'blue'},{id:'review',name:'Review',color:'orange'},{id:'done',name:'Done',color:'green'}];

export default async function ProjectPage({params,searchParams}:{params:Promise<{workspaceId:string;projectId:string}>;searchParams:Promise<{view?:string}>}) {
  const {workspaceId,projectId} = await params;
  const {user,workspaces,workspace,project,members,canEdit,canAdmin} = await projectContext(workspaceId,projectId);
  const {view} = await searchParams;
  const listView = (view === 'list' || (view !== 'board' && workspace.default_view === 'list'));
  const tasks = await query<{id:string;title:string;description:string;status:string;priority:string;assignee:string|null;due_date:string|null}>(
    `SELECT t.id,t.title,t.description,t.status,t.priority,u.name AS assignee,to_char(t.due_date,'YYYY-MM-DD') AS due_date FROM tasks t LEFT JOIN users u ON u.id=t.assignee_id WHERE t.project_id=$1 ORDER BY t.position,t.created_at`,[projectId]);
  const base = `/w/${workspaceId}/p/${projectId}`;
  return <AppShell user={user} workspaces={workspaces} activeWorkspace={workspaceId}>
    <Link className="back-link" href={`/w/${workspaceId}`}>← Back to {workspace.name}</Link>
    <div className="page-header row project-header"><div><div className="eyebrow">PROJECT · {project.status}</div><h1><DesktopFolder className="folder-heading" id={projectId} name={project.name}/>{project.name}</h1><p>{project.description || 'A little space for your next big idea.'}</p></div><span className="count-pill">{members.length} members · {tasks.length} tasks</span></div>
    <div className="project-tabs"><Link className={!listView?'selected':''} href={`${base}?view=board`}>Board</Link><Link className={listView?'selected':''} href={`${base}?view=list`}>List</Link></div>
    {canEdit && <form action={createTask} className="board-toolbar"><input type="hidden" name="projectId" value={projectId}/><label className="search-box"><input name="title" aria-label="Task title" placeholder="What needs to get done?" required maxLength={200}/></label><div className="toolbar-right"><select name="status" aria-label="Task status">{columns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><select name="priority" aria-label="Task priority" defaultValue="medium">{['low','medium','high','urgent'].map(p=><option key={p} value={p}>{p}</option>)}</select><button className="button primary"><DesktopObject kind="document"/><span className="desktop-caption">Add task</span></button></div></form>}
    {listView ? <div className="list-panel"><div className="list-header"><span>Task</span><span>Status</span><span>Priority</span><span>Assignee</span><span>Due date</span></div>{tasks.map(t=><Link className="list-row" key={t.id} href={`${base}/t/${t.id}`}><span>{t.title}</span><span className="status-tag">{t.status.replaceAll('_',' ')}</span><span className={`priority ${t.priority}`}>{t.priority}</span><span>{t.assignee || 'Unassigned'}</span><span>{t.due_date || '—'}</span></Link>)}{!tasks.length&&<div className="empty-state">No tasks yet.</div>}</div> : <div className="kanban">{columns.map(c=><section className="kanban-column" key={c.id}><div className="column-header"><span className={`column-dot ${c.color}`}/><strong>{c.name}</strong><span className="column-count">{tasks.filter(t=>t.status===c.id).length}</span></div><div className="column-cards">{tasks.filter(t=>t.status===c.id).map(t=><Link className="task-card" href={`${base}/t/${t.id}`} key={t.id}><div className="card-top"><span className={`priority-dot ${t.priority}`}/><span className="priority-word">{t.priority}</span></div><h3>{t.title}</h3>{t.description&&<p>{t.description}</p>}<div className="task-card-footer"><span>{t.due_date || 'No due date'}</span><span>{t.assignee || 'Unassigned'}</span></div></Link>)}</div>{!tasks.some(t=>t.status===c.id)&&<p className="column-empty">Nothing here yet</p>}</section>)}</div>}
    {canAdmin&&<details className="panel project-settings"><summary className="desktop-settings"><DesktopObject kind="tools"/><span className="desktop-caption">Project settings</span></summary><form action={updateProject} className="task-edit-form" style={{marginTop:20}}><input type="hidden" name="projectId" value={projectId}/><label>Name<input name="name" defaultValue={project.name} required maxLength={100}/></label><label>Description<textarea name="description" defaultValue={project.description} maxLength={2000}/></label><div className="field-grid"><label>Color<input type="color" name="color" defaultValue={project.color}/></label><label>Status<select name="status" defaultValue={project.status}><option value="active">Active</option><option value="archived">Archived</option></select></label></div><button className="button primary"><DesktopObject kind="disk"/><span className="desktop-caption">Save project</span></button></form></details>}
  </AppShell>;
}
