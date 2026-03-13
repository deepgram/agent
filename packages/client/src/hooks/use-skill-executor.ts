import { useCallback, useRef } from 'react';
import type { ConsoleAgentConfig, SkillContext, SkillResult } from '../types';
import { getSkill, skillRegistry } from '../skills/registry';
import { getProjectIdFromUrl, getToolResult, storeToolResult, loadState } from '../utils/state';

/**
 * Hook that provides skill execution with tool result caching.
 * Skills can read cached results from previous executions via ctx.getToolResult().
 */
export function useSkillExecutor(config: ConsoleAgentConfig) {
  const configRef = useRef(config);
  configRef.current = config;

  const buildContext = useCallback((): SkillContext => {
    return {
      projectId: configRef.current.projectId ?? getProjectIdFromUrl(),
      apiBaseUrl: configRef.current.apiBaseUrl ?? 'https://manage.deepgram.com',
      navigate: (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
      getToolResult: (skillId: string) => getToolResult(skillId),
      recentToolResults: loadState().recentToolResults ?? {},
    };
  }, []);

  /** Execute a skill by ID with params, caching the result */
  const executeSkill = useCallback(async (skillId: string, params: Record<string, unknown>): Promise<SkillResult> => {
    const skill = getSkill(skillId);
    if (!skill) {
      return { success: false, message: `Unknown skill: ${skillId}` };
    }
    const ctx = buildContext();
    try {
      const result = await skill.execute(params ?? {}, ctx);
      // Cache the result for other skills to reference
      if (result.success && result.data) {
        storeToolResult(loadState(), skillId, result.data);
      }
      return result;
    } catch (err) {
      return { success: false, message: `Skill error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }, [buildContext]);

  return {
    executeSkill,
    skills: skillRegistry,
  };
}
