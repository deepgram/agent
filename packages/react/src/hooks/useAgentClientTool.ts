import { useEffect } from "react";
import { useAgentContext } from "../context.js";
import type { FunctionCallItem } from "@deepgram/agent";

/**
 * Register a client-side tool handler that the agent can invoke.
 * Automatically unregisters when the component unmounts.
 *
 * Uses the latest closure — no stale state issues.
 *
 * @example
 * ```tsx
 * function MapComponent() {
 *   const [location, setLocation] = useState({ lat: 0, lng: 0 });
 *
 *   useAgentClientTool("getLocation", () => {
 *     return JSON.stringify(location);
 *   });
 *
 *   useAgentClientTool("setLocation", (fn) => {
 *     const params = JSON.parse(fn.input);
 *     setLocation(params);
 *     return JSON.stringify({ ok: true });
 *   });
 *
 *   return <Map center={location} />;
 * }
 * ```
 */
export function useAgentClientTool(
  name: string,
  handler: (fn: FunctionCallItem) => Promise<string> | string,
): void {
  const { registerClientTool, unregisterClientTool } = useAgentContext();

  useEffect(() => {
    registerClientTool(name, handler);
    return () => unregisterClientTool(name);
    // Re-register when handler changes to pick up latest closure
  }, [name, handler, registerClientTool, unregisterClientTool]);
}
