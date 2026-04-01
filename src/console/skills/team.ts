import type { Skill } from '../../types';
import { apiCall } from '../../skills/api';

export const teamSkills: Skill[] = [
  {
    id: 'team-list',
    name: 'List Team Members',
    description: 'List all members of the current project',
    category: 'team',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/members`);
      if (!res.success) return res;
      const members = (res.data as { members: Array<{ member_id: string; email: string; first_name: string; last_name: string; scopes: string[] }> }).members;
      const list = members.map((m) => `• ${m.first_name} ${m.last_name} (${m.email}) — ${m.scopes?.join(', ')}`).join('\n');
      return { success: true, message: `${members.length} member(s):\n${list}`, data: members };
    },
  },
  {
    id: 'team-invite',
    name: 'Invite Team Member',
    description: 'Navigate to the team page where the user can send an invitation to a new member',
    category: 'team',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/team`);
      return { success: true, message: 'Navigated to Team. You can invite new members from here.', navigateTo: `/project/${ctx.projectId}/team` };
    },
  },
  {
    id: 'team-list-invites',
    name: 'List Pending Invites',
    description: 'List all pending team invitations',
    category: 'team',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      const res = await apiCall(ctx, 'GET', `/projects/${ctx.projectId}/invites`);
      if (!res.success) return res;
      const invites = (res.data as { invites: Array<{ email: string; scope: string }> }).invites;
      if (invites.length === 0) return { success: true, message: 'No pending invitations.', data: invites };
      const list = invites.map((i) => `• ${i.email} (${i.scope})`).join('\n');
      return { success: true, message: `${invites.length} pending invite(s):\n${list}`, data: invites };
    },
  },
  {
    id: 'team-cancel-invite',
    name: 'Cancel Invitation',
    description: 'Navigate to team page where the user can revoke a pending invitation',
    category: 'team',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/team`);
      return { success: true, message: 'Navigated to Team. You can revoke invitations from there.', navigateTo: `/project/${ctx.projectId}/team` };
    },
  },
  {
    id: 'team-remove',
    name: 'Remove Team Member',
    description: 'Navigate to team page where the user can remove a member — this revokes their access immediately',
    category: 'team',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/team`);
      return { success: true, message: 'Navigated to Team. You can remove members from there.', navigateTo: `/project/${ctx.projectId}/team` };
    },
  },
  {
    id: 'team-change-role',
    name: 'Change Member Role',
    description: 'Navigate to the team page where the user can change a member\'s role or permissions',
    category: 'team',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      if (!ctx.projectId) return { success: false, message: 'No project selected.' };
      ctx.navigate(`/project/${ctx.projectId}/team`);
      return { success: true, message: 'Navigated to Team. You can change member roles from here.', navigateTo: `/project/${ctx.projectId}/team` };
    },
  },
];
