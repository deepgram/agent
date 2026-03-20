/**
 * Dynamically loads skill instructions from the deepgram/skills GitHub repo.
 *
 * Fetches the latest release, downloads the zipball, extracts SKILL.md files,
 * and appends their content to the system prompt so the agent has up-to-date
 * knowledge about Deepgram APIs, docs, and starter templates.
 */

const GITHUB_API = 'https://api.github.com/repos/deepgram/skills/releases/latest';

interface GitHubRelease {
  tag_name: string;
  zipball_url: string;
}

interface ParsedSkill {
  name: string;
  description: string;
  content: string;
}

/** Cache so we only fetch once per widget session */
let cachedSkills: ParsedSkill[] | null = null;
let cacheTag: string | null = null;

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Returns { name, description, body } or null if invalid.
 */
function parseSkillMd(raw: string): ParsedSkill | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatter = match[1];
  const body = match[2].trim();

  // Simple YAML parsing for name/description
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descMatch = frontmatter.match(/^description:\s*(.+)$/m);

  if (!nameMatch) return null;

  return {
    name: nameMatch[1].trim(),
    description: descMatch ? descMatch[1].trim() : '',
    content: body,
  };
}

/**
 * Fetch and parse skills from the latest GitHub release.
 * Returns an array of parsed skills, or an empty array on failure.
 * Results are cached for the widget session.
 */
export async function fetchGitHubSkills(): Promise<ParsedSkill[]> {
  if (cachedSkills) return cachedSkills;

  try {
    // 1. Get latest release metadata
    const releaseRes = await fetch(GITHUB_API, {
      headers: { 'Accept': 'application/vnd.github+json' },
    });

    if (!releaseRes.ok) {
      console.warn('[agent] Failed to fetch skills release:', releaseRes.status);
      return [];
    }

    const release: GitHubRelease = await releaseRes.json();
    if (cacheTag === release.tag_name && cachedSkills) return cachedSkills;

    // 2. Fetch the zipball as an ArrayBuffer
    const zipRes = await fetch(release.zipball_url);
    if (!zipRes.ok) {
      console.warn('[agent] Failed to fetch skills zipball:', zipRes.status);
      return [];
    }

    // 3. Use the browser's DecompressionStream + manual zip parsing,
    //    or fall back to fetching individual files via the GitHub tree API.
    //    Since zip parsing in the browser is complex, use the tree API instead.
    const skills = await fetchSkillsViaTree(release.tag_name);

    cachedSkills = skills;
    cacheTag = release.tag_name;
    return skills;
  } catch (err) {
    console.warn('[agent] Error loading GitHub skills:', err);
    return [];
  }
}

/**
 * Fetch SKILL.md files via the GitHub Git Tree API (avoids zip parsing).
 */
async function fetchSkillsViaTree(tag: string): Promise<ParsedSkill[]> {
  // Get the tree for the tag recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/deepgram/skills/git/trees/${tag}?recursive=1`,
    { headers: { 'Accept': 'application/vnd.github+json' } },
  );

  if (!treeRes.ok) return [];

  const tree = await treeRes.json() as {
    tree: Array<{ path: string; type: string; url: string }>;
  };

  // Find all SKILL.md files under skills/
  const skillFiles = tree.tree.filter(
    (f) => f.type === 'blob' && f.path.match(/^skills\/[^/]+\/SKILL\.md$/),
  );

  // Fetch each SKILL.md content in parallel
  const results = await Promise.allSettled(
    skillFiles.map(async (f) => {
      const blobRes = await fetch(f.url, {
        headers: { 'Accept': 'application/vnd.github.raw+json' },
      });
      if (!blobRes.ok) return null;
      const text = await blobRes.text();
      return parseSkillMd(text);
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ParsedSkill | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((s): s is ParsedSkill => s !== null);
}

/**
 * Build a system prompt section from loaded GitHub skills.
 * Returns a string to append to the main system prompt.
 */
export function buildGitHubSkillsPromptSection(skills: ParsedSkill[]): string {
  if (skills.length === 0) return '';

  const sections = skills.map(
    (s) => `### ${s.name}\n${s.description}\n\n${s.content}`,
  );

  return `\n\n## Deepgram Knowledge Base\nUse the following knowledge to answer technical questions about Deepgram. This is authoritative reference material.\n\n${sections.join('\n\n---\n\n')}`;
}
