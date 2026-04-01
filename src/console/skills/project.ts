import type { Skill } from '../../types';
import { apiCall } from '../../skills/api';

export const projectSkills: Skill[] = [
  {
    id: 'project-list',
    name: 'List Projects',
    description: 'List all projects the user has access to',
    category: 'project',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      const res = await apiCall(ctx, 'GET', '/projects_with_scopes');
      if (!res.success) return res;
      const projects = (res.data as { projects: Array<{ project_id: string; name: string; role: string }> }).projects;
      const list = projects.map((p) => `• ${p.name} (${p.role}) — ${p.project_id}`).join('\n');
      return { success: true, message: `You have ${projects.length} project(s):\n${list}`, data: projects };
    },
  },
  {
    id: 'project-details',
    name: 'Get Project Details',
    description: 'Get full details of the current project',
    category: 'project',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}`);
    },
  },
  {
    id: 'project-create',
    name: 'Create Project',
    description: 'Navigate to project creation — guide the user to create a new project from the console',
    category: 'project',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      ctx.navigate('/projects/new');
      return { success: true, message: 'Navigated to the new project page. You can create your project from here.', navigateTo: '/projects/new' };
    },
  },
  {
    id: 'project-rename',
    name: 'Rename Project',
    description: 'Navigate to project settings where the user can rename the project',
    category: 'project',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/settings`);
      return { success: true, message: 'Navigated to project settings. You can rename the project from here.', navigateTo: `/project/${ctx.projectId}/settings` };
    },
  },
  {
    id: 'project-delete',
    name: 'Delete Project',
    description: 'Navigate to project settings where the user can delete the project manually — this is too destructive to execute via the agent',
    category: 'project',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/settings`);
      return { success: true, message: 'Navigated to project settings. You can delete the project from there.', navigateTo: `/project/${ctx.projectId}/settings` };
    },
  },
  {
    id: 'project-leave',
    name: 'Leave Project',
    description: 'Navigate to project settings where the user can leave the project manually — this removes your access permanently',
    category: 'project',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/settings`);
      return { success: true, message: 'Navigated to project settings. You can leave the project from there.', navigateTo: `/project/${ctx.projectId}/settings` };
    },
  },
  {
    id: 'project-concurrency-limits',
    name: 'View Concurrency Limits',
    description: 'Get the concurrency limits for the current project',
    category: 'project',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'GET', `/projects/${ctx.projectId}/concurrency-limits`);
    },
  },
  {
    id: 'project-switch',
    name: 'Switch Project',
    description: 'Switch to a different project by navigating to its dashboard. Use the project UUID from project-list results, never a project name.',
    category: 'project',
    risk: 'safe',
    parameters: [
      { name: 'projectId', type: 'string', description: 'The project UUID to switch to (from project-list results)', required: true },
    ],
    execute: async (params, ctx) => {
      let pid = params.projectId as string;

      // If the LLM passed a name instead of a UUID, try to resolve it from cached project list
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(pid)) {
        const cached = ctx.getToolResult('project-list') as { projects?: Array<{ project_id: string; name: string }> } | undefined;
        if (cached?.projects) {
          const match = cached.projects.find(
            (p) => p.name.toLowerCase() === pid.toLowerCase()
          );
          if (match) {
            pid = match.project_id;
          } else {
            return { success: false, message: `Could not find a project named "${pid}". Use project-list first to see available projects and their IDs.` };
          }
        } else {
          return { success: false, message: `"${pid}" is not a valid project UUID. Use project-list first to get the correct project ID.` };
        }
      }

      ctx.navigate(`/project/${pid}/dashboard`);
      return { success: true, message: `Switched to project ${pid}.`, navigateTo: `/project/${pid}/dashboard` };
    },
  },
];
