import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const projectSkills: Skill[] = [
  {
    id: 'project-list',
    name: 'List Projects',
    description: 'List all projects the user has access to',
    category: 'project',
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
    id: 'project-create',
    name: 'Create Project',
    description: 'Create a new project',
    category: 'project',
    parameters: [
      { name: 'name', type: 'string', description: 'Name for the new project', required: true },
    ],
    execute: async (params, ctx) => {
      return apiCall(ctx, 'POST', '/projects', { name: params.name });
    },
  },
  {
    id: 'project-rename',
    name: 'Rename Project',
    description: 'Rename the current project',
    category: 'project',
    parameters: [
      { name: 'name', type: 'string', description: 'New name for the project', required: true },
    ],
    execute: async (params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'PATCH', `/projects/${ctx.projectId}`, { name: params.name });
    },
  },
  {
    id: 'project-delete',
    name: 'Delete Project',
    description: 'Permanently delete the current project (destructive)',
    category: 'project',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}`);
    },
  },
  {
    id: 'project-leave',
    name: 'Leave Project',
    description: 'Leave the current project (removes your access)',
    category: 'project',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      return apiCall(ctx, 'DELETE', `/projects/${ctx.projectId}/leave`);
    },
  },
  {
    id: 'project-switch',
    name: 'Switch Project',
    description: 'Switch to a different project by navigating to its dashboard',
    category: 'project',
    parameters: [
      { name: 'projectId', type: 'string', description: 'The project ID to switch to', required: true },
    ],
    execute: async (params, ctx) => {
      const pid = params.projectId as string;
      ctx.navigate(`/project/${pid}/dashboard`);
      return { success: true, message: `Switched to project ${pid}.`, navigateTo: `/project/${pid}/dashboard` };
    },
  },
];
