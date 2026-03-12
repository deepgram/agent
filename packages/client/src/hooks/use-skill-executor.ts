import { useCallback, useRef } from 'react';
import type { ConsoleAgentConfig, SkillContext, SkillResult } from '../types';
import { getSkill, skillRegistry } from '../skills/registry';
import { getProjectIdFromUrl } from '../utils/state';

/**
 * Hook that provides skill execution capability.
 * Parses LLM output for ```skill blocks and executes them.
 */
export function useSkillExecutor(config: ConsoleAgentConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  const buildContext = useCallback((): SkillContext => {
    return {
      projectId: configRef.current.projectId ?? getProjectIdFromUrl(),
      apiBaseUrl: configRef.current.apiBaseUrl ?? window.location.origin,
      navigate: (path: string) => {
        window.location.href = path;
      },
      getAuthToken: () => {
        // The Elm app stores auth in cookies — we pass credentials: 'include'
        // For explicit token auth, check common storage locations
        try {
          const stored = localStorage.getItem('dg_auth_token');
          if (stored) return stored;
        } catch { /* noop */ }
        return null;
      },
    };
  }, []);

  /** Parse a skill invocation from LLM text */
  const parseSkillInvocation = useCallback((text: string): { id: string; params: Record<string, unknown> } | null => {
    const match = text.match(/```skill\s*\n([\s\S]*?)\n```/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }, []);

  /** Execute a skill by ID with params */
  const executeSkill = useCallback(async (skillId: string, params: Record<string, unknown>): Promise<SkillResult> => {
    const skill = getSkill(skillId);
    if (!skill) {
      return { success: false, message: `Unknown skill: ${skillId}` };
    }
    const ctx = buildContext();
    try {
      return await skill.execute(params, ctx);
    } catch (err) {
      return { success: false, message: `Skill error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, [buildContext]);

  /** Process LLM response text — extract and execute any skill invocations */
  const processResponse = useCallback(async (text: string): Promise<{ result: SkillResult; skillId: string } | null> => {
    const invocation = parseSkillInvocation(text);
    if (!invocation) return null;
    const result = await executeSkill(invocation.id, invocation.params);
    return { result, skillId: invocation.id };
  }, [parseSkillInvocation, executeSkill]);

  return {
    executeSkill,
    processResponse,
    skills: skillRegistry,
  };
}
