import { useEffect, useMemo, useState } from 'react';
import { buildStacks, fetchOpenPrs, rebasePrOnParent } from '../lib/github';
import type { Settings, StackNode } from '../lib/types';

const defaultSettings: Settings = { token: '', owner: '', repo: '' };

export function PopupApp() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [roots, setRoots] = useState<StackNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.sync.get(defaultSettings, (stored) => {
      setSettings(stored as Settings);
    });
  }, []);

  const canLoad = useMemo(
    () => Boolean(settings.owner && settings.repo && settings.token),
    [settings]
  );

  async function loadStacks() {
    if (!canLoad) return;
    setLoading(true);
    setError('');
    try {
      const prs = await fetchOpenPrs(settings);
      setRoots(buildStacks(prs));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PRs');
    } finally {
      setLoading(false);
    }
  }

  function saveSettings() {
    chrome.storage.sync.set(settings);
  }

  return (
    <div className="app">
      <div className="section">
        <h3>StackHub</h3>
        <div className="grid">
          <label>
            Owner
            <input
              value={settings.owner}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, owner: event.target.value.trim() }))
              }
              placeholder="org-or-user"
            />
          </label>
          <label>
            Repo
            <input
              value={settings.repo}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, repo: event.target.value.trim() }))
              }
              placeholder="repository"
            />
          </label>
        </div>
        <label>
          GitHub token (repo scope)
          <input
            type="password"
            value={settings.token}
            onChange={(event) =>
              setSettings((prev) => ({ ...prev, token: event.target.value.trim() }))
            }
            placeholder="ghp_..."
          />
        </label>
        <div className="actions">
          <button onClick={saveSettings} className="secondary">
            Save
          </button>
          <button onClick={loadStacks} disabled={!canLoad || loading}>
            {loading ? 'Loading…' : 'Refresh stacked PRs'}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>

      <div className="section">
        {roots.length === 0 ? (
          <p>No stack graph yet. Save settings and click refresh.</p>
        ) : (
          roots.map((node) => (
            <StackBranch
              key={node.pr.number}
              node={node}
              settings={settings}
              onUpdated={loadStacks}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StackBranch({
  node,
  settings,
  onUpdated,
  depth = 0
}: {
  node: StackNode;
  settings: Settings;
  onUpdated: () => Promise<void>;
  depth?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const hasParentCandidate = node.children.length > 0;

  async function alignChildrenToThis() {
    setBusy(true);
    setError('');
    try {
      for (const child of node.children) {
        await rebasePrOnParent(settings, child.pr.number, node.pr.head.ref);
      }
      await onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to align stack');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ marginLeft: depth * 8 }}>
      <div className="card">
        <div className="row">
          <strong>#{node.pr.number}</strong>
          <span className="badge">{node.pr.base.ref} ← {node.pr.head.ref}</span>
        </div>
        <div>{node.pr.title}</div>
        <div className="actions">
          <button
            className="secondary"
            onClick={() => chrome.tabs.create({ url: node.pr.html_url })}>
            Open PR
          </button>
          <button
            className="secondary"
            onClick={() => navigator.clipboard.writeText(`gh pr checkout ${node.pr.number}`)}>
            Copy checkout
          </button>
          {hasParentCandidate ? (
            <button onClick={alignChildrenToThis} disabled={busy}>
              {busy ? 'Aligning…' : 'Align children base'}
            </button>
          ) : null}
        </div>
        {error ? <div className="error">{error}</div> : null}
      </div>

      {node.children.map((child) => (
        <StackBranch
          key={child.pr.number}
          node={child}
          settings={settings}
          onUpdated={onUpdated}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}
