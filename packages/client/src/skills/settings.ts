import type { Skill } from '../types';
import { apiCall } from '../utils/api';

export const settingsSkills: Skill[] = [
  {
    id: 'settings-profile',
    name: 'View Profile',
    description: 'Get the current user profile information',
    category: 'settings',
    parameters: [],
    execute: async (_params, ctx) => {
      return apiCall(ctx, 'GET', '/auth/user', undefined, true);
    },
  },
  {
    id: 'settings-update-name',
    name: 'Update Name',
    description: 'Update the user\'s first and/or last name',
    category: 'settings',
    parameters: [
      { name: 'firstName', type: 'string', description: 'New first name', required: false },
      { name: 'lastName', type: 'string', description: 'New last name', required: false },
    ],
    execute: async (params, ctx) => {
      const body: Record<string, unknown> = {};
      if (params.firstName) body.first_name = params.firstName;
      if (params.lastName) body.last_name = params.lastName;
      return apiCall(ctx, 'PATCH', '/auth/profile', body, true);
    },
  },
  {
    id: 'settings-change-password',
    name: 'Change Password',
    description: 'Change the user\'s password (requires current password)',
    category: 'settings',
    parameters: [
      { name: 'currentPassword', type: 'string', description: 'Current password', required: true },
      { name: 'newPassword', type: 'string', description: 'New password', required: true },
    ],
    execute: async (params, ctx) => {
      return apiCall(ctx, 'POST', '/auth/change_password', {
        current_password: params.currentPassword,
        new_password: params.newPassword,
      }, true);
    },
  },
];
