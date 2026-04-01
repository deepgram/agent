const GITHUB_API = 'https://api.github.com/repos/deepgram/skills/releases/latest';

/** Fetch skill files from the deepgram/skills public repo and return a system prompt context block. */
export async function fetchDeepgramSkillsContext(): Promise<string> {
  try {
    const releaseRes = await fetch(GITHUB_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!releaseRes.ok) return '';

    const release: { tag_name: string } = await releaseRes.json();

    const treeRes = await fetch(
      `https://api.github.com/repos/deepgram/skills/git/trees/${release.tag_name}?recursive=1`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (!treeRes.ok) return '';

    const tree: { tree: Array<{ type: string; path: string; url: string }> } = await treeRes.json();
    const skillFiles = tree.tree.filter(
      (f) => f.type === 'blob' && /^skills\/[^/]+\/SKILL\.md$/.test(f.path),
    );

    const results = await Promise.allSettled(
      skillFiles.map(async (f) => {
        const blobRes = await fetch(f.url, {
          headers: { Accept: 'application/vnd.github.raw+json' },
        });
        if (!blobRes.ok) return null;
        const text = await blobRes.text();
        const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) return null;
        const nameMatch = match[1].match(/^name:\s*(.+)$/m);
        if (!nameMatch) return null;
        return { name: nameMatch[1].trim(), content: match[2].trim() };
      }),
    );

    const skills = results
      .filter((r): r is PromiseFulfilledResult<{ name: string; content: string }> =>
        r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value);

    if (skills.length === 0) return '';

    const sections = skills.map((s) => `### ${s.name}\n${s.content}`).join('\n\n---\n\n');
    return `## Deepgram Knowledge Base\nUse the following to answer technical questions about Deepgram APIs, SDKs, and features.\n\n${sections}`;
  } catch {
    return '';
  }
}
