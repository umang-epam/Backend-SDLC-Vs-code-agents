'use strict';

const POLL_MS = 3000;
const STALE_MS = 120000;
const STAGE_LABELS = {
  '01-requirements': 'Requirements',
  '02-context': 'Context',
  '03-generation': 'Generation',
  '04-review': 'Review',
  '05-tests': 'Tests',
  '06-postman': 'Postman',
};

const elements = {
  select: document.querySelector('#run-select'),
  connection: document.querySelector('#connection'),
  connectionText: document.querySelector('#connection span:last-child'),
  syncCopy: document.querySelector('#sync-copy'),
  refresh: document.querySelector('#refresh'),
  notice: document.querySelector('#notice'),
  empty: document.querySelector('#empty-state'),
  emptyRoot: document.querySelector('#empty-root'),
  dashboard: document.querySelector('#dashboard'),
  runId: document.querySelector('#run-id'),
  overallStatus: document.querySelector('#overall-status'),
  currentStage: document.querySelector('#current-stage'),
  completedCount: document.querySelector('#completed-count'),
  attentionCount: document.querySelector('#attention-count'),
  lastUpdated: document.querySelector('#last-updated'),
  staleLabel: document.querySelector('#stale-label'),
  manifestRef: document.querySelector('#manifest-ref'),
  pipeline: document.querySelector('#pipeline'),
  rows: document.querySelector('#stage-rows'),
  fileUpdated: document.querySelector('#file-updated'),
  detailNumber: document.querySelector('#detail-number'),
  detailTitle: document.querySelector('#detail-title'),
  detailStatus: document.querySelector('#detail-status'),
  detailRevision: document.querySelector('#detail-revision'),
  detailGate: document.querySelector('#detail-gate'),
  detailStarted: document.querySelector('#detail-started'),
  detailUpdated: document.querySelector('#detail-updated'),
  detailActivity: document.querySelector('#detail-activity'),
  detailReferences: document.querySelector('#detail-references'),
  artifactRoot: document.querySelector('#artifact-root'),
};

let selectedRun = '';
let selectedStage = '';
let latestStatus = null;
let polling = false;

function setConnection(mode, label) {
  elements.connection.classList.toggle('is-connected', mode === 'connected');
  elements.connection.classList.toggle('is-error', mode === 'error');
  elements.connectionText.textContent = label;
}

function setNotice(message) {
  elements.notice.hidden = !message;
  elements.notice.textContent = message || '';
}

function displayTime(value, includeSeconds = false) {
  if (!value || Number.isNaN(Date.parse(value))) return '--';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {}),
    timeZoneName: 'short',
  }).format(new Date(value));
}

function ageText(value) {
  const timestamp = Date.parse(value || '');
  if (Number.isNaN(timestamp)) return 'No valid persisted timestamp';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  return `Updated ${Math.floor(hours / 24)}d ago`;
}

function statusClass(status) {
  return ['pending', 'running', 'blocked', 'failed', 'completed'].includes(status) ? `status-${status}` : 'status-unknown';
}

function setChip(element, status) {
  element.className = `status-chip ${statusClass(status)}`;
  element.textContent = status || 'unknown';
}

function stageIndex(stageId) {
  const number = stageId?.match(/^(\d\d)-/);
  return number ? number[1] : '--';
}

function newTextElement(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = value || '--';
  return node;
}

function buildPipeline(stages) {
  elements.pipeline.replaceChildren();
  for (const stage of stages) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pipeline-step ${statusClass(stage.status)}${selectedStage === stage.id ? ' is-selected' : ''}`;
    button.setAttribute('aria-label', `${stage.id}, ${STAGE_LABELS[stage.id] || stage.id}, ${stage.status}`);
    button.setAttribute('aria-pressed', String(selectedStage === stage.id));
    button.append(newTextElement('span', 'step-marker', stageIndex(stage.id)));
    button.append(newTextElement('span', '', STAGE_LABELS[stage.id] || stage.id));
    button.addEventListener('click', () => selectStage(stage.id));
    item.append(button);
    elements.pipeline.append(item);
  }
}

function buildRows(stages) {
  elements.rows.replaceChildren();
  for (const stage of stages) {
    const row = document.createElement('tr');
    row.className = `stage-row${selectedStage === stage.id ? ' is-selected' : ''}`;
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${stage.id}, ${STAGE_LABELS[stage.id] || stage.id}, ${stage.status}`);
    row.addEventListener('click', () => selectStage(stage.id));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectStage(stage.id);
      }
    });

    const nameCell = document.createElement('td');
    const name = document.createElement('span');
    name.className = 'stage-name';
    name.append(newTextElement('span', 'table-stage-code', stageIndex(stage.id)));
    name.append(document.createTextNode(STAGE_LABELS[stage.id] || stage.id));
    nameCell.append(name, newTextElement('span', 'agent-name', stage.agent));
    const statusCell = document.createElement('td');
    const chip = document.createElement('span');
    setChip(chip, stage.status);
    statusCell.append(chip);
    const revisionCell = newTextElement('td', 'revision', stage.revision);
    const gateCell = newTextElement('td', 'gate-value', stage.gate);
    const updatedCell = newTextElement('td', 'mono', displayTime(stage.updatedAt));
    row.append(nameCell, statusCell, revisionCell, gateCell, updatedCell);
    elements.rows.append(row);
  }
}

function setReferences(value) {
  elements.detailReferences.replaceChildren();
  const references = value && value !== '-' ? value.split(/[,;]/).map((reference) => reference.trim()).filter(Boolean) : [];
  if (!references.length) {
    elements.detailReferences.textContent = value || '--';
    return;
  }
  for (const reference of references) elements.detailReferences.append(newTextElement('span', 'reference-token', reference));
}

function showStage(stage) {
  if (!stage) {
    elements.detailNumber.textContent = '--';
    elements.detailTitle.textContent = 'No stage selected';
    setChip(elements.detailStatus, 'unknown');
    elements.detailRevision.textContent = 'REV --';
    elements.detailGate.textContent = '--';
    elements.detailStarted.textContent = '--';
    elements.detailUpdated.textContent = '--';
    elements.detailActivity.textContent = '--';
    setReferences('');
    return;
  }

  elements.detailNumber.textContent = stageIndex(stage.id);
  elements.detailTitle.textContent = stage.agent || STAGE_LABELS[stage.id] || stage.id;
  setChip(elements.detailStatus, stage.status);
  elements.detailRevision.textContent = `REV ${stage.revision || '--'}`;
  elements.detailGate.textContent = stage.gate || '--';
  elements.detailStarted.textContent = displayTime(stage.startedAt);
  elements.detailUpdated.textContent = displayTime(stage.updatedAt);
  elements.detailActivity.textContent = stage.activity || '--';
  setReferences(stage.references);
}

function selectStage(stageId) {
  selectedStage = stageId;
  if (latestStatus) {
    buildPipeline(latestStatus.stages || []);
    buildRows(latestStatus.stages || []);
    showStage((latestStatus.stages || []).find((stage) => stage.id === selectedStage));
  }
}

function renderStatus(status) {
  latestStatus = status;
  elements.dashboard.hidden = false;
  elements.empty.hidden = true;
  elements.runId.textContent = status.snapshot?.runId || status.runId || selectedRun;
  setChip(elements.overallStatus, status.snapshot?.status);
  const currentId = status.snapshot?.currentStage;
  elements.currentStage.textContent = currentId === 'null' ? 'No active stage' : (STAGE_LABELS[currentId] || currentId || '--');
  const stages = status.stages || [];
  elements.completedCount.innerHTML = `${stages.filter((stage) => stage.status === 'completed').length} <small>/ 6</small>`;
  elements.attentionCount.textContent = String(stages.filter((stage) => stage.status === 'blocked' || stage.status === 'failed').length);
  elements.lastUpdated.textContent = displayTime(status.snapshot?.lastUpdated, true);
  elements.fileUpdated.textContent = `FILE MTIME ${displayTime(status.fileModifiedAt, true)}`;
  elements.manifestRef.textContent = status.snapshot?.manifest ? `MANIFEST ${status.snapshot.manifest}` : 'MANIFEST reference missing';
  elements.artifactRoot.textContent = `ARTIFACT ROOT ${status.artifactRoot || ''}`;

  const persistedAt = status.snapshot?.lastUpdated || status.fileModifiedAt;
  const age = Date.now() - Date.parse(persistedAt || '');
  if (Number.isNaN(age)) {
    elements.staleLabel.className = 'stale-label';
    elements.staleLabel.textContent = 'Timestamp unavailable';
  } else if (age > STALE_MS) {
    elements.staleLabel.className = 'stale-label';
    elements.staleLabel.textContent = `STALE - ${ageText(persistedAt)}`;
  } else {
    elements.staleLabel.className = 'stale-label is-fresh';
    elements.staleLabel.textContent = ageText(persistedAt);
  }

  if (status.valid === false) {
    setNotice(`Malformed live-status.md: ${status.errors.join(' ')}`);
  } else {
    setNotice('');
  }

  if (!stages.some((stage) => stage.id === selectedStage)) selectedStage = currentId && stages.some((stage) => stage.id === currentId) ? currentId : stages[0]?.id || '';
  buildPipeline(stages);
  buildRows(stages);
  showStage(stages.find((stage) => stage.id === selectedStage));
}

function renderEmpty(rootPath, message) {
  latestStatus = null;
  elements.dashboard.hidden = true;
  elements.empty.hidden = false;
  elements.emptyRoot.textContent = message || `Artifact root: ${rootPath || '(not found)'}`;
  setNotice('');
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function updateRunSelect(runs) {
  const previousRun = selectedRun;
  elements.select.replaceChildren();
  if (runs.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No runs discovered';
    elements.select.append(option);
    elements.select.disabled = true;
    selectedRun = '';
    return;
  }

  for (const run of runs) {
    const option = document.createElement('option');
    option.value = run.id;
    option.textContent = run.statusFileExists ? run.id : `${run.id} - missing live-status.md`;
    elements.select.append(option);
  }
  elements.select.disabled = false;
  selectedRun = runs.some((run) => run.id === previousRun) ? previousRun : runs[0].id;
  elements.select.value = selectedRun;
}

async function poll() {
  if (polling) return;
  polling = true;
  elements.refresh.disabled = true;
  elements.syncCopy.textContent = 'Synchronizing artifact files';
  try {
    const index = await getJson('/api/runs');
    updateRunSelect(index.runs || []);
    elements.emptyRoot.textContent = index.rootExists
      ? `Artifact root is present: ${index.artifactRoot}`
      : `Artifact root has not been created: ${index.artifactRoot}`;

    if (index.error) throw new Error(index.error);
    if (!selectedRun) {
      renderEmpty(index.artifactRoot, index.runs?.length ? 'No run selected' : elements.emptyRoot.textContent);
      setConnection('connected', 'Connected');
    } else {
      const status = await getJson(`/api/runs/${encodeURIComponent(selectedRun)}`);
      status.artifactRoot = index.artifactRoot;
      if (!status.statusFileExists) {
        renderEmpty(index.artifactRoot, `${selectedRun} has no live-status.md file yet.`);
        setConnection('connected', 'Connected');
      } else {
        renderStatus(status);
        setConnection('connected', 'Connected');
      }
    }
    elements.syncCopy.textContent = `Last sync ${displayTime(new Date().toISOString(), true)}`;
  } catch (error) {
    setConnection('error', 'Disconnected');
    elements.syncCopy.textContent = `Sync failed ${displayTime(new Date().toISOString(), true)}`;
    setNotice(error.message);
    if (!selectedRun) renderEmpty('', 'The local monitor could not read its artifact root.');
  } finally {
    polling = false;
    elements.refresh.disabled = false;
  }
}

elements.refresh.addEventListener('click', () => void poll());
elements.select.addEventListener('change', () => {
  selectedRun = elements.select.value;
  selectedStage = '';
  void poll();
});

await poll();
window.setInterval(() => void poll(), POLL_MS);