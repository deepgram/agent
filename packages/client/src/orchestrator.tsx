import { createRoot } from 'react-dom/client';
import type { ConsoleAgentConfig } from './types';
import { Sidebar } from './components/sidebar';
import { InlineChat } from './components/inline';

let sidebarRoot: ReturnType<typeof createRoot> | null = null;
let sidebarContainer: HTMLDivElement | null = null;
let sidebarOpen = false;

export function orchestrate(config: ConsoleAgentConfig): void {
  const { containerId, buttonId } = config;

  if (containerId) {
    mountInline(containerId, config);
    observeDOM(config, containerId);
  }

  if (buttonId) {
    bindButton(buttonId, config);
  }

  // Listen for toggle events (from external buttons or keyboard shortcut)
  window.addEventListener('dg-agent-toggle', () => toggleSidebar(config));
}

function mountInline(containerId: string, config: ConsoleAgentConfig): void {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (el.dataset.dgAgentMounted) return;
  el.dataset.dgAgentMounted = 'true';
  const root = createRoot(el);
  root.render(<InlineChat config={config} />);
}

function bindButton(buttonId: string, config: ConsoleAgentConfig): void {
  document.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest(`#${buttonId}`);
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    toggleSidebar(config);
  }, true);
}

function toggleSidebar(config: ConsoleAgentConfig): void {
  sidebarOpen = !sidebarOpen;

  if (sidebarOpen) {
    mountSidebar(config);
  } else {
    unmountSidebar();
  }

  // Update button active state using the configured buttonId
  const btn = config.buttonId ? document.getElementById(config.buttonId) : null;
  if (btn) {
    btn.classList.toggle('dg-ask-ai-btn--active', sidebarOpen);
  }
}

function mountSidebar(config: ConsoleAgentConfig): void {
  if (sidebarContainer) return;
  sidebarContainer = document.createElement('div');
  sidebarContainer.id = 'dg-console-agent-sidebar';
  document.body.appendChild(sidebarContainer);
  sidebarRoot = createRoot(sidebarContainer);
  sidebarRoot.render(
    <Sidebar
      config={config}
      onClose={() => toggleSidebar(config)}
    />
  );
}

function unmountSidebar(): void {
  if (sidebarRoot) {
    sidebarRoot.unmount();
    sidebarRoot = null;
  }
  if (sidebarContainer) {
    sidebarContainer.remove();
    sidebarContainer = null;
  }
}

function observeDOM(config: ConsoleAgentConfig, containerId: string): void {
  let debounceTimer: ReturnType<typeof setTimeout>;

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      mountInline(containerId, config);
    }, 100);
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
