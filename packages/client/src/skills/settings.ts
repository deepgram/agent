import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const settingsSkills: Skill[] = [
  {
    id: 'settings-profile',
    name: 'View Profile',
    description: 'Get the current user profile information',
    category: 'settings',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      return apiCall(ctx, 'GET', '/auth/user');
    },
  },
  {
    id: 'settings-update-name',
    name: 'Update Name',
    description: 'Update the user\'s first and/or last name',
    category: 'settings',
    risk: 'confirm',
    parameters: [
      { name: 'firstName', type: 'string', description: 'New first name', required: false },
      { name: 'lastName', type: 'string', description: 'New last name', required: false },
    ],
    execute: async (params, ctx) => {
      const body: Record<string, unknown> = {};
      if (params.firstName) body.first_name = params.firstName;
      if (params.lastName) body.last_name = params.lastName;
      return apiCall(ctx, 'PATCH', '/auth/profile', body);
    },
  },
  {
    id: 'settings-change-password',
    name: 'Change Password',
    description: 'Navigate to settings page where the user can change their password securely',
    category: 'settings',
    risk: 'dangerous',
    parameters: [],
    execute: async (_params, ctx) => {
      ctx.navigate('/settings');
      return { success: true, message: 'Navigated to Settings. You can change your password from there.', navigateTo: '/settings' };
    },
  },
];
