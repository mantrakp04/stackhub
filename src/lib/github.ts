import type { GithubPr, Settings, StackNode } from './types';

const DEPENDS_ON_REGEX = /depends\s+on\s+#(\d+)/i;

export async function fetchOpenPrs(settings: Settings): Promise<GithubPr[]> {
  const { owner, repo, token } = settings;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${message}`);
  }

  return (await response.json()) as GithubPr[];
}

export function buildStacks(prs: GithubPr[]): StackNode[] {
  const byNumber = new Map(prs.map((pr) => [pr.number, pr]));
  const byHeadRef = new Map(prs.map((pr) => [pr.head.ref, pr]));

  const nodes = new Map<number, StackNode>(
    prs.map((pr) => [pr.number, { pr, children: [] }])
  );

  for (const pr of prs) {
    let parentPr = detectParent(pr, byNumber, byHeadRef);
    if (!parentPr) continue;

    const node = nodes.get(pr.number);
    const parentNode = nodes.get(parentPr.number);
    if (!node || !parentNode || parentPr.number === pr.number) continue;

    node.parent = parentPr.number;
    parentNode.children.push(node);
  }

  return [...nodes.values()].filter((node) => !node.parent);
}

function detectParent(
  pr: GithubPr,
  byNumber: Map<number, GithubPr>,
  byHeadRef: Map<string, GithubPr>
) {
  const match = pr.body?.match(DEPENDS_ON_REGEX);
  if (match) {
    const parent = byNumber.get(Number(match[1]));
    if (parent) return parent;
  }

  return byHeadRef.get(pr.base.ref);
}

export async function rebasePrOnParent(
  settings: Settings,
  prNumber: number,
  newBaseBranch: string
) {
  const { owner, repo, token } = settings;
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ base: newBaseBranch })
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update base branch for #${prNumber}`);
  }
}
