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
    description: 'Navigate to settings where the user can update their name',
    category: 'settings',
    risk: 'safe',
    parameters: [],
    execute: async (_params, ctx) => {
      ctx.navigate('/settings');
      return { success: true, message: 'Navigated to Settings. You can update your name from here.', navigateTo: '/settings' };
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
