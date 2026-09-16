import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { workspaceContext } from '@/lib/workspace';
import { query } from '@/lib/db';
import { createProject } from '@/app/actions';
import { ArrowRight, FolderKanban, Plus, Settings2, Users } from 'lucide-react';
export default async function WorkspacePage({params}:{params:Promise<{workspaceId:string}>}) {
  const {workspaceId} = await params; const {user,role,workspaces,workspace} = await workspaceContext(workspaceId);
  const projects = await query<{id:string;name:string;description:string;color:string;status:string;tasks:string;done:string;members:string}>(`SELECT p.id,p.name,p.description,p.color,p.status,(SELECT count(*)::text FROM tasks t WHERE t.project_id=p.id) tasks,(SELECT count(*)::text FROM tasks t WHERE t.project_id=p.id AND t.status='done') done,(SELECT count(*)::text FROM project_members pm WHERE pm.project_id=p.id) members FROM projects p WHERE p.workspace_id=$1 ORDER BY p.created_at DESC`,[workspaceId]);
  const members = await query<{name:string;role:string}>(`SELECT u.name,wm.role FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=$1 ORDER BY wm.joined_at LIMIT 5`,[workspaceId]);
  return <AppShell user={user} workspaces={workspaces} activeWorkspace={workspaceId}><div className="page-header row"><div><div className="eyebrow">WORKSPACE</div><h1><span className="heading-icon" style={{background:workspace.color}}>{workspace.icon}</span>{workspace.name}</h1><p>All your projects in one place.</p></div><Link className="button secondary" href={`/w/${workspaceId}/settings`}><Settings2 size={17}/> Settings</Link></div>
    <div className="stat-grid"><div className="stat-card"><FolderKanban/><div><strong>{projects.length}</strong><span>Projects</span></div></div><div className="stat-card"><Users/><div><strong>{members.length}</strong><span>Team members</span></div></div><div className="stat-card"><span className="stat-glyph">✓</span><div><strong>{projects.reduce((n,p)=>n+Number(p.done),0)}</strong><span>Completed tasks</span></div></div></div>
    <div className="section-heading top-gap"><div><h2>Projects</h2><p>Track progress across your team.</p></div><span className="count-pill">{projects.length} total</span></div>
    <div className="project-grid">{projects.map(p=><Link className="project-card" href={`/w/${workspaceId}/p/${p.id}`} key={p.id}><span className="project-icon" style={{background:p.color}}><FolderKanban size={22}/></span><span className="project-card-heading"><strong>{p.name}</strong><ArrowRight size={16}/></span><p>{p.description || 'Your team project'}</p><div className="progress"><span style={{width:`${Number(p.tasks)?Number(p.done)/Number(p.tasks)*100:0}%`,background:p.color}}/></div><div className="project-meta"><span>{p.done}/{p.tasks} tasks done</span><span>{p.members} members</span></div></Link>)}
    {role!=='viewer'&&<form action={createProject} className="project-card project-create"><span className="create-symbol"><Plus size={20}/></span><strong>New project</strong><p>Turn your next idea into a plan.</p><input type="hidden" name="workspaceId" value={workspaceId}/><input name="name" placeholder="Project name" maxLength={100} required/><button className="button primary">Create project <ArrowRight size={16}/></button></form>}</div>
    {role==='viewer' && !projects.length && <div className="empty-state panel">No projects yet.</div>}
  </AppShell>;
}
