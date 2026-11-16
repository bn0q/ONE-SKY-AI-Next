import { useRef, useState, type ChangeEvent } from 'react';
import { downloadDocx, processFiles } from './api';
import { show, UNASSIGNED_KEY, type ActionItem, type Flag, type MeetingSummary, type ProcessResponse } from './types';

function FlagBadge({ flag }: { flag: Flag }) {
  return (
    <div className={`flag flag--${flag.kind}`} data-testid="flag-item" data-kind={flag.kind}>
      <span className="flag__kind">{flag.kind.replace(/-/g, ' ')}</span>
      <span className="flag__detail">{flag.detail}</span>
      {flag.evidence.length > 0 && (
        <ul className="flag__evidence">
          {flag.evidence.slice(0, 3).map((line, index) => (
            <li key={`${line}-${index}`}>“{line}”</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionRow({ item }: { item: ActionItem }) {
  return (
    <li className="action" data-testid="action-item">
      <span className="action__task">{item.task}</span>
      <span className="action__due">due {show(item.due)}</span>
    </li>
  );
}

function MeetingCard({ meeting }: { meeting: MeetingSummary }) {
  return (
    <article className="card meeting" data-testid="meeting-summary">
      <header className="meeting__header">
        <div>
          <h3>{meeting.title}</h3>
          <p className="muted mono">{meeting.fileName}</p>
        </div>
        <span className="pill">{meeting.format}</span>
      </header>

      <dl className="meeting__meta">
        <div><dt>Date</dt><dd>{show(meeting.date)}</dd></div>
        <div><dt>Participants</dt><dd>{meeting.participants.length ? meeting.participants.join(', ') : '—'}</dd></div>
      </dl>

      <section className="meeting__block">
        <h4>Topics &amp; summary</h4>
        {meeting.topics.length === 0 ? <p className="muted">—</p> : (
          <ul className="topics">
            {meeting.topics.map((topic, index) => (
              <li key={`${topic.title}-${index}`}>
                <strong>{topic.title}</strong>
                <p>{topic.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="meeting__block">
        <h4>Decisions</h4>
        {meeting.decisions.length === 0 ? (
          <p className="muted">No decision recorded.</p>
        ) : (
          <ul className="plain-list">
            {meeting.decisions.map((decision, index) => (
              <li key={`${decision.text}-${index}`}>
                <span className="tag">{decision.topic}</span> {decision.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="meeting__block">
        <h4>Action items</h4>
        {meeting.actionItems.length === 0 ? <p className="muted">—</p> : (
          <ul className="plain-list">
            {meeting.actionItems.map((item) => <ActionRow key={item.id} item={item} />)}
          </ul>
        )}
      </section>

      {meeting.flags.length > 0 && (
        <section className="meeting__block">
          <h4>Flagged issues</h4>
          <div className="flags">{meeting.flags.map((flag, index) => <FlagBadge key={`${flag.kind}-${index}`} flag={flag} />)}</div>
        </section>
      )}
    </article>
  );
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = [...files];
    for (const file of Array.from(incoming)) {
      const duplicate = next.some((existing) => existing.name === file.name && existing.size === file.size);
      if (!duplicate) next.push(file);
    }
    setFiles(next);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
  }

  async function handleSubmit() {
    if (files.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await processFiles(files));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload() {
    if (!result) return;
    setDownloadError(null);
    try {
      await downloadDocx(result);
    } catch (caught) {
      setDownloadError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  const groupedOwners = result
    ? Object.keys(result.groupedActions).sort((a, b) =>
        a === UNASSIGNED_KEY ? 1 : b === UNASSIGNED_KEY ? -1 : a.localeCompare(b))
    : [];

  const issues = result?.meetings.flatMap((meeting) =>
    meeting.flags
      .filter((flag) => flag.kind !== 'parse-error')
      .map((flag) => ({ meeting: meeting.fileName, flag })),
  ) ?? [];

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead__inner">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">◈</span>
            <div>
              <h1>Meeting Notes Distiller</h1>
              <p>Turn raw transcripts into decisions, owners and deadlines.</p>
            </div>
          </div>
          <span className="badge">rule-based · EN / TH</span>
        </div>
      </header>

      <main className="main">
        <section className="panel upload" aria-labelledby="upload-heading">
          <div className="panel__head">
            <h2 id="upload-heading">1 · Upload meeting notes</h2>
            <p className="muted">Choose one or more <code>.txt</code> files. You can add more rounds before submitting.</p>
          </div>

          <div className="upload__controls">
            <label className="file-button">
              <input
                ref={inputRef}
                data-testid="file-input"
                type="file"
                accept=".txt,text/plain"
                multiple
                onChange={handleChange}
              />
              <span>+ Choose .txt files</span>
            </label>

            <button
              type="button"
              className="primary"
              data-testid="submit-button"
              disabled={files.length === 0 || busy}
              onClick={handleSubmit}
            >
              {busy ? 'Processing…' : `Process ${files.length} ${files.length === 1 ? 'file' : 'files'}`}
            </button>

            {files.length > 0 && (
              <button type="button" className="ghost" onClick={() => { setFiles([]); setResult(null); }}>
                Clear
              </button>
            )}
          </div>

          {files.length > 0 && (
            <ul className="file-list" data-testid="file-list">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`}>
                  <span className="mono">{file.name}</span>
                  <span className="muted">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                  >×</button>
                </li>
              ))}
            </ul>
          )}

          {error && <div className="alert alert--error" role="alert" data-testid="error-banner">{error}</div>}
          {result?.warnings.map((warning) => (
            <div className="alert alert--warn" key={warning} data-testid="warning-banner">{warning}</div>
          ))}
        </section>

        {result && (
          <section className="results" data-testid="results-section">
            <div className="results__bar">
              <div>
                <h2>2 · Results</h2>
                <p className="muted">{result.meetings.length} meeting{result.meetings.length === 1 ? '' : 's'} processed</p>
              </div>
              <button type="button" className="primary" data-testid="download-button" onClick={handleDownload}>
                ↓ Download as MS Word
              </button>
            </div>
            {downloadError && <div className="alert alert--error" role="alert">{downloadError}</div>}

            <div className="results__grid">
              <div className="column" data-testid="meeting-summaries">
                <h3 className="column__title">Meeting summaries</h3>
                {result.meetings.map((meeting) => <MeetingCard key={meeting.fileName} meeting={meeting} />)}
              </div>

              <div className="column">
                <div className="card" data-testid="grouped-actions">
                  <h3 className="column__title">Action items by owner</h3>
                  {groupedOwners.length === 0 ? <p className="muted">—</p> : groupedOwners.map((owner) => (
                    <div className="owner-group" key={owner} data-testid="owner-group">
                      <h4 className={owner === UNASSIGNED_KEY ? 'owner owner--none' : 'owner'}>{owner}</h4>
                      <ul className="plain-list">
                        {result.groupedActions[owner].map((item) => <ActionRow key={item.id} item={item} />)}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="card" data-testid="flagged-issues">
                  <h3 className="column__title">Unassigned / inconsistent items</h3>
                  {issues.length === 0 ? <p className="muted">None flagged.</p> : (
                    <div className="flags">
                      {issues.map(({ meeting, flag }, index) => (
                        <div key={`${meeting}-${flag.kind}-${index}`}>
                          <p className="muted mono small">{meeting}</p>
                          <FlagBadge flag={flag} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Meeting Notes Distiller · deterministic, offline, no API key required</span>
      </footer>
    </div>
  );
}
