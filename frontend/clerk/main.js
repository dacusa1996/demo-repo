document.addEventListener('DOMContentLoaded', () => {
  // --- auth + storage ---
  const params = new URLSearchParams(window.location.search);
  const tabId = params.get('tabId') || window.name || crypto.randomUUID();
  window.name = tabId;
  const scopedKey = (k) => `${k}_${tabId}`;
  const getScoped = (k) => localStorage.getItem(scopedKey(k)) || localStorage.getItem(k);
  const removeScoped = (k) => { localStorage.removeItem(scopedKey(k)); localStorage.removeItem(k); };

  const userRaw = getScoped('admas_user');
  const token = getScoped('admas_token');
  const baseRoot = `${window.location.origin}/frontend`;
  if (!userRaw || !token) {
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }
  let user;
  try { user = JSON.parse(userRaw); } catch (err) {
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  // --- api helper ---
  const apiBase = 'https://nasty-squids-turn.loca.lt';
  const apiFetch = async (path, options = {}) => {
    const res = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || (data && data.success === false)) {
      throw new Error((data && data.error) || 'Request failed');
    }
    return data;
  };

  // --- elements ---
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const profileLink = document.getElementById('profile-link');
  const profileModal = document.getElementById('profile-modal');
  const profileClose = document.getElementById('profile-close');
  const pName = document.getElementById('p-name');
  const pEmail = document.getElementById('p-email');
  const pRole = document.getElementById('p-role');
  const pDept = document.getElementById('p-dept');
  const logoutBtn = document.getElementById('logout-btn');
  const topSearch = document.getElementById('top-search');
  const topSearchResults = document.getElementById('top-search-results');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileOverlay = document.getElementById('mobile-overlay');

  const kpiRequests = document.getElementById('kpi-requests-today');
  const kpiApproved = document.getElementById('kpi-approved');
  const kpiIssued = document.getElementById('kpi-issued');
  const kpiOverdue = document.getElementById('kpi-overdue');

  const queueBody = document.getElementById('queue-body');
  const queueTabs = document.querySelectorAll('[data-queue-tab]');

  const requestsBody = document.getElementById('requests-panel-body');
  const reqTabs = document.querySelectorAll('[data-req-tab]');
  const issuedBody = document.getElementById('issued-panel-body');
  const maintenanceBody = document.getElementById('maintenance-body');
  const maintenanceTabs = document.querySelectorAll('[data-maint-tab]');
  const maintenanceNewBtn = document.getElementById('maintenance-new-btn');
  const maintModal = document.getElementById('maintenance-modal');
  const maintForm = document.getElementById('maint-form');
  const maintClose = document.getElementById('maint-close');
  const maintCancel = document.getElementById('maint-cancel');
  const maintSelect = document.getElementById('maint-asset');
  const maintIssue = document.getElementById('maint-issue');
  const maintMsg = document.getElementById('maint-msg');

  const assetsBody = document.getElementById('assets-table-body');
  const assetsSearch = document.getElementById('assets-search');
  const assetsFilterDept = document.getElementById('assets-filter-dept');
  const assetsFilterStatus = document.getElementById('assets-filter-status');

  const activityBody = document.getElementById('activity-body');
  const myActivityBody = document.getElementById('my-activity-body');
  const activityModal = document.getElementById('activity-modal');
  const activityClose = document.getElementById('activity-close');
  const activityReq = document.getElementById('activity-req');
  const activityAsset = document.getElementById('activity-asset');
  const activityStatus = document.getElementById('activity-status');
  const activityBorrower = document.getElementById('activity-borrower');
  const activityDept = document.getElementById('activity-dept');
  const activityDue = document.getElementById('activity-due');
  const activityReason = document.getElementById('activity-reason');
  const navItems = document.querySelectorAll('.nav-item[data-panel]');
  const panels = document.querySelectorAll('.content-panel');
  const welcomeTitle = document.getElementById('welcome-title');

  // new request modal
  const newReqBtn = document.getElementById('new-request-btn');
  const newReqModal = document.getElementById('new-request-modal');
  const newReqClose = document.getElementById('new-req-close');
  const newReqCancel = document.getElementById('new-req-cancel');
  const newReqForm = document.getElementById('new-req-form');
  const newReqAsset = document.getElementById('new-req-asset');
  const newReqAssetSearch = document.getElementById('new-req-asset-search');
  const newReqBorrower = document.getElementById('new-req-borrower');
  const newReqDept = document.getElementById('new-req-dept');
  const newReqReturn = document.getElementById('new-req-return');
  const newReqReason = document.getElementById('new-req-reason');
  const newReqMsg = document.getElementById('new-req-msg');

  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('admas-updates') : null;

  // --- state ---
  let requests = [];
  let assets = [];
  let assetsLoaded = false;
  let currentQueueTab = 'PENDING';
  let currentReqTab = 'ALL';
  let selectedAssetId = null;
  let maintenance = [];
  let currentMaintTab = 'OPEN';
  let maintenanceLoaded = false;

  // --- helpers ---
  const fmtDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString().slice(0, 10);
  };
  const hideTopSearch = () => {
    if (topSearchResults) {
      topSearchResults.innerHTML = '';
      topSearchResults.hidden = true;
    }
  };
  const switchPanel = (panelKey) => {
    navItems.forEach((n) => n.classList.toggle('active', n.dataset.panel === panelKey));
    panels.forEach((p) => p.classList.remove('active'));
    const target = document.getElementById(`panel-${panelKey}`);
    if (target) target.classList.add('active');
  };

  // --- header ---
  if (userNameEl) userNameEl.textContent = user.name || 'Clerk';
  if (userRoleEl) userRoleEl.textContent = user.department ? `Dept: ${user.department}` : 'Dept: -';
  if (welcomeTitle) welcomeTitle.textContent = `Hi, ${user.name || 'Clerk'}`;
  if (profileLink) profileLink.title = user.name || 'Profile';
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (profileModal) {
        if (pName) pName.textContent = user.name || '-';
        if (pEmail) pEmail.textContent = user.email || '-';
        if (pRole) pRole.textContent = user.role || '-';
        if (pDept) pDept.textContent = user.department || '-';
        profileModal.classList.add('open');
        document.body.classList.add('modal-open');
      }
    });
  }
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        profileModal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    });
  }
  if (profileClose) {
    profileClose.addEventListener('click', () => {
      if (profileModal) profileModal.classList.remove('open');
      document.body.classList.remove('modal-open');
    });
  }
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    removeScoped('admas_token');
    removeScoped('admas_user');
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
  });
  if (menuToggle) menuToggle.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  if (mobileOverlay) mobileOverlay.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
  if (topSearchResults) {
    document.addEventListener('click', (e) => {
      if (!topSearchResults.contains(e.target) && e.target !== topSearch) {
        hideTopSearch();
      }
    });
  }
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = item.dataset.panel;
      if (panel) switchPanel(panel);
    });
  });

  // --- renderers ---
  const activeRequestForAsset = (assetId) => {
    const target = Number(assetId);
    if (Number.isNaN(target)) return null;
    // prefer issued > approved > pending
    const rank = { ISSUED: 3, APPROVED: 2, PENDING: 1 };
    let chosen = null;
    requests.forEach((r) => {
      const status = (r.status || '').toUpperCase();
      if (!rank[status]) return;
      if (Number(r.asset_id) !== target) return;
      const currentRank = chosen ? rank[chosen.status] || 0 : 0;
      if ((rank[status] || 0) > currentRank) chosen = { ...r, status };
    });
    return chosen;
  };

  const renderKpis = () => {
    const today = new Date().toISOString().slice(0, 10);
    const reqToday = requests.filter((r) => fmtDate(r.request_date) === today).length;
    const approved = requests.filter((r) => (r.status || '').toUpperCase() === 'APPROVED').length;
    const issued = requests.filter((r) => (r.status || '').toUpperCase() === 'ISSUED').length;
    const overdue = requests.filter((r) => {
      if ((r.status || '').toUpperCase() !== 'ISSUED') return false;
      if (!r.expected_return) return false;
      return new Date(r.expected_return) < new Date();
    }).length;
    if (kpiRequests) kpiRequests.textContent = reqToday;
    if (kpiApproved) kpiApproved.textContent = approved;
    if (kpiIssued) kpiIssued.textContent = issued;
    if (kpiOverdue) kpiOverdue.textContent = overdue;
  };

  const renderQueue = () => {
    if (!queueBody) return;
    queueBody.innerHTML = '';
    const rows = requests.filter((r) => {
      const status = (r.status || '').toUpperCase();
      if (currentQueueTab === 'PENDING') return status === 'PENDING';
      if (currentQueueTab === 'APPROVED') return status === 'APPROVED';
      if (currentQueueTab === 'ISSUED') return status === 'ISSUED';
      return false;
    });

    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No requests to show.';
      tr.appendChild(td);
      queueBody.appendChild(tr);
      return;
    }

    rows.forEach((r) => {
      const status = (r.status || '').toUpperCase();
      let actionLabel = 'View';
      if (status === 'APPROVED') actionLabel = 'Issue';
      else if (status === 'ISSUED') actionLabel = 'Return';
      else if (status === 'PENDING') actionLabel = 'Cancel';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.asset_tag || '-'}</td>
        <td>${r.borrower_name || '-'}</td>
        <td>${r.borrower_department || '-'}</td>
        <td>${fmtDate(r.expected_return)}</td>
        <td><button class="pill-btn slim" data-action="${actionLabel.toLowerCase()}" data-id="${r.id}">${actionLabel}</button></td>
      `;
      queueBody.appendChild(tr);
    });
  };

  const renderRequestsPanel = () => {
    if (!requestsBody) return;
    requestsBody.innerHTML = '';
    const rows = requests.filter((r) => {
      const status = (r.status || '').toUpperCase();
      if (status === 'ISSUED' || status.startsWith('RETURN')) return false;
      if (currentReqTab === 'ALL') return true;
      if (currentReqTab === 'PENDING') return status === 'PENDING';
      if (currentReqTab === 'APPROVED') return status === 'APPROVED';
      if (currentReqTab === 'REJECTED') return status === 'REJECTED';
      return true;
    });
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'No requests to show.';
      tr.appendChild(td);
      requestsBody.appendChild(tr);
      return;
    }
    rows.forEach((r) => {
      const status = (r.status || '').toUpperCase();
      let actionLabel = 'View';
      let actionAttr = '';
      if (status === 'APPROVED') { actionLabel = 'Issue'; actionAttr = 'data-action="issue"'; }
      else if (status === 'PENDING') { actionLabel = 'Cancel'; actionAttr = 'data-action="cancel"'; }
      const reasonText = (r.comment || r.reason || '').replace(/"/g, '&quot;');
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.asset_tag || r.asset_name || '-'}</td>
        <td>${r.borrower_name || '-'}</td>
        <td>${r.borrower_department || '-'}</td>
        <td>${fmtDate(r.expected_return)}</td>
        <td>${status}</td>
        <td><button class="pill-btn slim" data-req-id="${r.id}" data-status="${status}" data-reason="${reasonText}" ${actionAttr}>${actionLabel}</button></td>
      `;
      requestsBody.appendChild(tr);
    });
  };

  const renderActivity = () => {
    if (!activityBody) return;
    activityBody.innerHTML = '';
    const stamp = (r) => r.return_date || r.issued_at || r.approved_at || r.request_date || '';
    const statusLabel = (s) => {
      const v = (s || '').toUpperCase();
      if (v === 'PENDING') return 'Requested';
      if (v === 'APPROVED') return 'Approved';
      if (v === 'REJECTED') return 'Rejected';
      if (v === 'ISSUED') return 'Issued';
      if (v.startsWith('RETURN')) return 'Returned';
      if (v === 'CANCELLED') return 'Cancelled';
      return v || '-';
    };
    const recent = [...requests]
      .sort((a, b) => new Date(stamp(b)) - new Date(stamp(a)))
      .slice(0, 8);
    if (!recent.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No recent activity.';
      tr.appendChild(td);
      activityBody.appendChild(tr);
      return;
    }
    recent.forEach((r) => {
      const tr = document.createElement('tr');
      const dateVal = stamp(r);
      tr.innerHTML = `
        <td>${fmtDate(dateVal)}</td>
        <td>${statusLabel(r.status)}</td>
        <td>${r.asset_tag || r.asset_name || '-'}</td>
        <td>${r.id ? `REQ-${r.id}` : '-'}</td>
        <td><button class="pill-btn slim" data-act-detail="${r.id || ''}">View</button></td>
      `;
      activityBody.appendChild(tr);
    });
  };
  const renderMyActivity = () => {
    if (!myActivityBody) return;
    myActivityBody.innerHTML = '';
    const rows = [...requests].sort((a, b) => (b.id || 0) - (a.id || 0)).slice(0, 20);
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No activity yet.';
      tr.appendChild(td);
      myActivityBody.appendChild(tr);
      return;
    }
    const statusAction = (s) => {
      const v = (s || '').toUpperCase();
      if (v === 'PENDING') return 'Requested';
      if (v === 'APPROVED') return 'Approved';
      if (v === 'REJECTED') return 'Rejected';
      if (v === 'ISSUED') return 'Issued';
      if (v.startsWith('RETURN')) return 'Returned';
      if (v === 'CANCELLED') return 'Cancelled';
      return v || '-';
    };
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      const date = fmtDate(r.return_date || r.issued_at || r.approved_at || r.request_date);
      tr.innerHTML = `
        <td>${date}</td>
        <td>${statusAction(r.status)}</td>
        <td>${r.asset_tag || r.asset_name || '-'}</td>
        <td>${r.id ? `REQ-${r.id}` : '-'}</td>
        <td><button class="pill-btn slim" data-act-detail="${r.id}">View</button></td>
      `;
      myActivityBody.appendChild(tr);
    });
  };

  const renderTopSearch = () => {
    if (!topSearch || !topSearchResults) return;
    const term = (topSearch.value || '').toLowerCase().trim();
    if (term.length < 2) {
      hideTopSearch();
      return;
    }
    const assetMatches = (assets || [])
      .filter((a) => `${a.asset_tag || ''} ${a.name || ''}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((a) => ({
        type: 'asset',
        label: `${a.asset_tag || '-'} · ${a.name || '-'}`,
        search: a.asset_tag || a.name || ''
      }));
    const requestMatches = (requests || [])
      .filter((r) => `${r.asset_tag || ''} ${r.borrower_name || ''} ${r.reason || ''}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((r) => ({
        type: 'request',
        label: `Req #${r.id} · ${r.asset_tag || '-'} · ${r.borrower_name || '-'}`,
        search: r.asset_tag || r.borrower_name || ''
      }));
    const combined = [...assetMatches, ...requestMatches].slice(0, 8);
    if (!combined.length) {
      hideTopSearch();
      return;
    }
    topSearchResults.innerHTML = combined.map((item) => `<div class="search-item" data-type="${item.type}" data-search="${item.search || ''}">${item.label}</div>`).join('');
    topSearchResults.hidden = false;
  };

  const renderIssuedPanel = () => {
    if (!issuedBody) return;
    issuedBody.innerHTML = '';
    const rows = requests.filter((r) => (r.status || '').toUpperCase() === 'ISSUED');
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No issued/borrowed items.';
      tr.appendChild(td);
      issuedBody.appendChild(tr);
      return;
    }
    rows.forEach((r) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${r.asset_tag || r.asset_name || '-'}</td>
        <td>${r.borrower_name || '-'}</td>
        <td>${r.borrower_department || '-'}</td>
        <td>${fmtDate(r.expected_return)}</td>
        <td><button class="pill-btn slim" data-action="return" data-id="${r.id}">Return</button></td>
      `;
      issuedBody.appendChild(tr);
    });
  };

  const renderAssetsPanel = () => {
    if (!assetsBody) return;
    assetsBody.innerHTML = '';
    const term = (assetsSearch && assetsSearch.value || '').toLowerCase();
    const statusFilter = assetsFilterStatus ? assetsFilterStatus.value.toLowerCase() : '';
    const deptFilter = assetsFilterDept ? assetsFilterDept.value : '';

    const rows = assets.filter((a) => {
      if (statusFilter && (a.status || '').toLowerCase() !== statusFilter) return false;
      if (deptFilter && (a.department || '') !== deptFilter) return false;
      if (term) {
        const hay = `${a.asset_tag || ''} ${a.name || ''}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No assets to show.';
      tr.appendChild(td);
      assetsBody.appendChild(tr);
      return;
    }

    rows.forEach((a) => {
      const baseStatus = (a.status || '').toLowerCase();
      const activeReq = activeRequestForAsset(a.id);
      const derivedStatus = activeReq
        ? (activeReq.status === 'ISSUED' ? 'borrowed' : 'reserved')
        : baseStatus;
      const borrower = derivedStatus === 'borrowed' ? (activeReq && activeReq.borrower_name) || '-' : '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.asset_tag || '-'}</td>
        <td>${a.name || '-'}</td>
        <td>${derivedStatus || '-'}</td>
        <td>${a.cond || '-'}</td>
        <td>${borrower}</td>
      `;
      assetsBody.appendChild(tr);
    });
  };

  // --- fetchers ---
  const fetchRequests = async () => {
    try {
      const data = await apiFetch('/api/requests');
      requests = (data && data.data && data.data.requests) || data.requests || [];
      renderKpis();
      renderQueue();
      renderRequestsPanel();
      renderIssuedPanel();
      if (assetsLoaded) renderAssetsPanel();
      renderActivity();
      renderMyActivity();
    } catch (err) {
      if (queueBody) queueBody.innerHTML = `<tr><td colspan="6">Failed to load requests: ${err.message}</td></tr>`;
      if (requestsBody) requestsBody.innerHTML = `<tr><td colspan="7">Failed to load requests</td></tr>`;
      if (issuedBody) issuedBody.innerHTML = `<tr><td colspan="7">Failed to load requests</td></tr>`;
      if (myActivityBody) myActivityBody.innerHTML = `<tr><td colspan="4">Failed to load activity</td></tr>`;
    }
  };

  const fetchMaintenance = async () => {
    try {
      const data = await apiFetch('/api/maintenance');
      maintenance = (data && data.data && data.data.maintenance) || data.maintenance || [];
      maintenanceLoaded = true;
      renderMaintenance();
    } catch (err) {
      maintenanceLoaded = true;
      if (maintenanceBody) {
        maintenanceBody.innerHTML = `<tr><td colspan="5">Failed to load maintenance: ${err.message}</td></tr>`;
      }
    }
  };

  const renderMaintenance = () => {
    if (!maintenanceBody) return;
    maintenanceBody.innerHTML = '';
    const rows = maintenance.filter((m) => {
      const s = (m.status || '').toLowerCase();
      if (currentMaintTab === 'OPEN') return s === 'pending' || s === 'open';
      if (currentMaintTab === 'IN_PROGRESS') return s === 'in_progress';
      if (currentMaintTab === 'COMPLETED') return s === 'completed';
      return false;
    });
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.textContent = 'No maintenance records.';
      tr.appendChild(td);
      maintenanceBody.appendChild(tr);
      return;
    }
    rows.forEach((m) => {
      const tr = document.createElement('tr');
      let actionLabel = '-';
      let actionAttr = '';
      const statusUp = (m.status || '').toUpperCase();
      if (statusUp === 'PENDING' || statusUp === 'OPEN') { actionLabel = 'Start'; actionAttr = 'data-act="start"'; }
      else if (statusUp === 'IN_PROGRESS') { actionLabel = 'Complete'; actionAttr = 'data-act="complete"'; }
      const loggedBy =
        m.logged_by_name ||
        m.reported_by_name ||
        (m.logged_by === user.id ? (user.name || 'You') : m.logged_by) ||
        '-';
      tr.innerHTML = `
        <td>${m.asset_tag || m.asset || '-'}</td>
        <td>${m.issue || '-'}</td>
        <td>${statusUp || '-'}</td>
        <td>${loggedBy}</td>
        <td>${actionAttr ? `<button class="pill-btn slim" data-maint-id="${m.id || ''}" ${actionAttr}>${actionLabel}</button>` : '-'}</td>
      `;
      maintenanceBody.appendChild(tr);
    });
  };

  const fetchAssets = async () => {
    try {
      const data = await apiFetch('/api/assets');
      assets = (data && data.data && data.data.assets) || data.assets || [];
      assetsLoaded = true;
      if (assetsFilterDept) {
        const current = assetsFilterDept.value;
        const depts = Array.from(new Set(assets.map((a) => a.department).filter(Boolean)));
        assetsFilterDept.innerHTML = ['<option value="">Dept</option>', ...depts.map((d) => `<option value="${d}">${d}</option>`)].join('');
        assetsFilterDept.value = current;
      }
      populateAssetSelect(newReqAssetSearch ? newReqAssetSearch.value : '');
      renderAssetsPanel();
    } catch (err) {
      if (newReqAsset) {
        newReqAsset.innerHTML = '<option value="">Failed to load assets</option>';
        newReqAsset.disabled = true;
      }
    }
  };


  // --- listeners ---
  queueTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      queueTabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentQueueTab = btn.dataset.queueTab || 'PENDING';
      renderQueue();
    });
  });
  reqTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      reqTabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentReqTab = btn.dataset.reqTab || 'ALL';
      renderRequestsPanel();
    });
  });

  maintenanceTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      maintenanceTabs.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentMaintTab = btn.dataset.maintTab || 'OPEN';
      renderMaintenance();
    });
  });

  if (requestsBody) {
    requestsBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-req-id]');
      if (!btn) return;
      const status = (btn.dataset.status || '').toUpperCase();
      const id = btn.dataset.reqId;
      if (status === 'REJECTED') {
        const reason = (btn.dataset.reason || '').trim();
        alert(reason ? `Reason: ${reason}` : 'No reason given');
        return;
      }
      if (status === 'PENDING' && btn.dataset.action === 'cancel') {
        if (!confirm('Cancel this pending request?')) return;
        await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
        await fetchRequests();
        if (channel) channel.postMessage({ type: 'requests-updated' });
        return;
      }
      if (status === 'APPROVED' && btn.dataset.action === 'issue') {
        await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ISSUED' }) });
        await fetchRequests();
        if (channel) channel.postMessage({ type: 'requests-updated' });
        return;
      }
    });
  }

  if (queueBody) {
    queueBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action][data-id]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      try {
        if (action === 'cancel') {
          if (!confirm('Cancel this pending request?')) return;
          await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }) });
        } else if (action === 'issue') {
          await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'ISSUED' }) });
        } else if (action === 'return') {
          await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RETURNED' }) });
        }
        await fetchRequests();
        if (channel) channel.postMessage({ type: 'requests-updated' });
      } catch (err) {
        alert(err.message || 'Action failed');
      }
    });
  }

  if (issuedBody) {
    issuedBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action="return"][data-id]');
      if (!btn) return;
      const id = btn.dataset.id;
      try {
        await apiFetch(`/api/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RETURNED' }) });
        await fetchRequests();
        if (channel) channel.postMessage({ type: 'requests-updated' });
      } catch (err) {
        alert(err.message || 'Failed to mark returned');
      }
    });
  }

  if (assetsBody) {
    assetsBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const assetId = Number(btn.dataset.asset);
      const reqId = btn.dataset.req;
      try {
        if (action === 'asset-request') {
          openNewRequest();
          if (newReqAsset) newReqAsset.value = String(assetId);
          return;
        }
        if (action === 'asset-return' && reqId) {
          await apiFetch(`/api/requests/${reqId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'RETURNED' }) });
          await fetchRequests();
          await fetchAssets();
          if (channel) channel.postMessage({ type: 'requests-updated' });
        }
      } catch (err) {
        alert(err.message || 'Action failed');
      }
    });
  }

  if (maintenanceBody) {
    maintenanceBody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-maint-id][data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      const id = Number(btn.dataset.maintId);
      try {
        const nextStatus = act === 'start' ? 'IN_PROGRESS' : act === 'complete' ? 'COMPLETED' : null;
        if (!nextStatus) return;
        await apiFetch(`/api/maintenance/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        await fetchMaintenance();
        await fetchAssets();
      } catch (err) {
        alert(err.message || 'Failed to update maintenance');
      }
    });
  }

  const populateMaintenanceSelect = () => {
    if (!maintSelect || !assetsLoaded) return;
    const activeMaint = new Set(
      maintenance
        .filter((m) => {
          const s = (m.status || '').toLowerCase();
          return s === 'pending' || s === 'open' || s === 'in_progress';
        })
        .map((m) => Number(m.asset_id))
    );
    const opts = assets
      .filter((a) => {
        const baseStatus = (a.status || '').toLowerCase();
        if (baseStatus === 'under_maintenance') return false;
        if (baseStatus === 'borrowed') return false;
        if (activeMaint.has(Number(a.id))) return false;
        return true;
      })
      .map((a) => {
        const label = a.asset_tag ? `${a.asset_tag}${a.name ? ' - ' + a.name : ''}` : a.name || a.id;
        return `<option value="${a.id}">${label}</option>`;
      });
    maintSelect.innerHTML = opts.length
      ? ['<option value="">Select an asset</option>', ...opts].join('')
      : '<option value="">No available assets</option>';
    maintSelect.disabled = opts.length === 0;
  };

  const openMaintenanceModal = async () => {
    if (!assetsLoaded) await fetchAssets();
    if (!maintenanceLoaded) await fetchMaintenance();
    populateMaintenanceSelect();
    if (maintMsg) { maintMsg.textContent = ''; maintMsg.style.color = ''; }
    if (maintForm) maintForm.reset();
    if (maintModal) maintModal.classList.add('open');
  };
  const closeMaintenanceModal = () => { if (maintModal) maintModal.classList.remove('open'); };

  if (maintenanceNewBtn) maintenanceNewBtn.addEventListener('click', openMaintenanceModal);
  if (maintClose) maintClose.addEventListener('click', closeMaintenanceModal);
  if (maintCancel) maintCancel.addEventListener('click', closeMaintenanceModal);
  if (maintModal) maintModal.addEventListener('click', (e) => { if (e.target === maintModal) closeMaintenanceModal(); });
  if (maintForm) {
    maintForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (maintMsg) { maintMsg.textContent = ''; maintMsg.style.color = ''; }
      const assetId = maintSelect ? Number(maintSelect.value) : null;
      const issue = maintIssue ? maintIssue.value.trim() : '';
      if (!assetId || !issue) {
        if (maintMsg) { maintMsg.textContent = 'Asset and issue are required.'; maintMsg.style.color = '#b91c1c'; }
        return;
      }
      apiFetch('/api/maintenance', { method: 'POST', body: JSON.stringify({ asset_id: assetId, issue }) })
        .then(async () => {
          currentMaintTab = 'OPEN';
          maintenanceTabs.forEach((b) => {
            if (b.dataset.maintTab === 'OPEN') b.classList.add('active'); else b.classList.remove('active');
          });
          await fetchMaintenance();
          await fetchAssets();
          closeMaintenanceModal();
        })
        .catch((err) => {
          if (maintMsg) { maintMsg.textContent = err.message || 'Failed to log maintenance'; maintMsg.style.color = '#b91c1c'; }
        });
    });
  }

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      const target = item.dataset.panel;
      panels.forEach((p) => p.classList.remove('active'));
      const panelEl = document.getElementById(`panel-${target}`);
      if (panelEl) panelEl.classList.add('active');
      if (target === 'assets' && !assetsLoaded) fetchAssets();
      if (target === 'maintenance') {
        if (!maintenanceLoaded) fetchMaintenance();
        else renderMaintenance();
      }
      if (target === 'myactivity') renderMyActivity();
    });
  });

  if (assetsSearch) assetsSearch.addEventListener('input', renderAssetsPanel);
  [assetsFilterDept, assetsFilterStatus].forEach((sel) => {
    if (!sel) return;
    sel.addEventListener('change', renderAssetsPanel);
  });

  // new request modal helpers
  const populateAssetSelect = (needle = '') => {
    if (!newReqAsset) return;
    const term = (needle || '').toLowerCase();
    const available = assets.filter((a) => {
      const baseStatus = (a.status || '').toLowerCase();
      if (baseStatus !== 'available') return false;
      if (activeRequestForAsset(a.id)) return false;
      return true;
    });
    const filtered = term
      ? available.filter((a) =>
          (a.asset_tag || '').toLowerCase().includes(term) ||
          (a.name || '').toLowerCase().includes(term)
        )
      : available;
    if (!filtered.length) {
      newReqAsset.innerHTML = `<option value="">${term ? 'No matches' : 'No available assets'}</option>`;
      newReqAsset.disabled = true;
      return;
    }
    newReqAsset.disabled = false;
    newReqAsset.innerHTML = [
      '<option value="">Select an asset</option>',
      ...filtered.map((a) => `<option value="${a.id}">${a.asset_tag} - ${a.name}</option>`)
    ].join('');
    const hasCurrent = selectedAssetId && filtered.some((a) => String(a.id) === String(selectedAssetId));
    if (hasCurrent) {
      newReqAsset.value = String(selectedAssetId);
    } else if (filtered.length) {
      selectedAssetId = filtered[0].id;
      newReqAsset.value = String(selectedAssetId);
    } else {
      selectedAssetId = null;
      newReqAsset.value = '';
    }
  };
  if (newReqAssetSearch) {
    newReqAssetSearch.addEventListener('input', (e) => {
      const val = e.target.value || '';
      populateAssetSelect(val);
    });
  }
  if (newReqAsset) {
    newReqAsset.addEventListener('change', (e) => {
      selectedAssetId = e.target.value ? Number(e.target.value) : null;
    });
  }

  const openNewRequest = () => {
    if (newReqMsg) { newReqMsg.textContent = ''; newReqMsg.style.color = ''; }
    if (newReqForm) newReqForm.reset();
    selectedAssetId = null;
    if (newReqDept) {
      newReqDept.value = '';
      newReqDept.placeholder = user.department || '';
    }
    if (newReqModal) newReqModal.classList.add('open');
    fetchAssets();
  };
  const closeNewRequest = () => { if (newReqModal) newReqModal.classList.remove('open'); };
  if (newReqBtn) newReqBtn.addEventListener('click', openNewRequest);
  if (newReqClose) newReqClose.addEventListener('click', closeNewRequest);
  if (newReqCancel) newReqCancel.addEventListener('click', closeNewRequest);
  if (newReqModal) newReqModal.addEventListener('click', (e) => { if (e.target === newReqModal) closeNewRequest(); });

  if (newReqForm) {
    newReqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (newReqMsg) { newReqMsg.textContent = ''; newReqMsg.style.color = ''; }
      const payload = {
        asset_id: Number(newReqAsset && newReqAsset.value),
        borrower_name: newReqBorrower ? newReqBorrower.value.trim() : '',
        borrower_department: newReqDept ? (newReqDept.value.trim() || user.department || '') : (user.department || ''),
        expected_return: newReqReturn ? newReqReturn.value : null,
        reason: newReqReason ? newReqReason.value.trim() : ''
      };
      if (!payload.asset_id || !payload.borrower_name) {
        if (newReqMsg) { newReqMsg.textContent = 'Asset and borrower are required.'; newReqMsg.style.color = '#b91c1c'; }
        return;
      }
      try {
        await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(payload) });
        if (newReqMsg) { newReqMsg.textContent = 'Request created.'; newReqMsg.style.color = '#16a34a'; }
        await fetchRequests();
        closeNewRequest();
        if (channel) channel.postMessage({ type: 'requests-updated' });
      } catch (err) {
        if (newReqMsg) { newReqMsg.textContent = err.message || 'Failed to create request'; newReqMsg.style.color = '#b91c1c'; }
      }
    });
  }

  // activity modal
  const openActivityModal = (r) => {
    if (!activityModal) return;
    if (activityReq) activityReq.textContent = r.id ? `REQ-${r.id}` : '-';
    if (activityAsset) activityAsset.textContent = r.asset_tag || r.asset_name || '-';
    if (activityStatus) activityStatus.textContent = r.status || '-';
    if (activityBorrower) activityBorrower.textContent = r.borrower_name || '-';
    if (activityDept) activityDept.textContent = r.borrower_department || '-';
    if (activityDue) activityDue.textContent = fmtDate(r.expected_return);
    if (activityReason) activityReason.textContent = r.reason || r.comment || '-';
    activityModal.classList.add('open');
    document.body.classList.add('modal-open');
  };
  const closeActivityModal = () => {
    if (activityModal) activityModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };
  if (activityClose) activityClose.addEventListener('click', closeActivityModal);
  if (activityModal) activityModal.addEventListener('click', (e) => { if (e.target === activityModal) closeActivityModal(); });

  if (activityBody) {
    activityBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act-detail]');
      if (!btn) return;
      const id = Number(btn.dataset.actDetail);
      const r = requests.find((x) => Number(x.id) === id);
      if (r) openActivityModal(r);
    });
  }

  if (myActivityBody) {
    myActivityBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act-detail]');
      if (!btn) return;
      const id = Number(btn.dataset.actDetail);
      const r = requests.find((x) => Number(x.id) === id);
      if (r) openActivityModal(r);
    });
  }

  // top search dropdown
  if (topSearch) {
    topSearch.addEventListener('input', renderTopSearch);
    topSearch.addEventListener('focus', renderTopSearch);
  }
  if (topSearchResults) {
    topSearchResults.addEventListener('click', (e) => {
      const item = e.target.closest('.search-item');
      if (!item) return;
      const type = item.dataset.type;
      const val = item.dataset.search || '';
      hideTopSearch();
      if (type === 'asset') {
        if (assetsSearch) assetsSearch.value = val;
        switchPanel('assets');
        renderAssetsPanel();
      } else if (type === 'request') {
        if (queueSearch) queueSearch.value = val;
        currentQueueTab = 'PENDING';
        document.querySelectorAll('[data-queue-tab]').forEach((c) => {
          c.classList.toggle('active', (c.dataset.queueTab || '') === 'PENDING');
        });
        renderQueue();
        switchPanel('dashboard');
      }
    });
    document.addEventListener('click', (e) => {
      if (!topSearchResults.contains(e.target) && e.target !== topSearch) {
        hideTopSearch();
      }
    });
  }

  // Broadcast updates
  if (channel) {
    channel.onmessage = (evt) => {
      if (!evt || !evt.data || evt.data.type !== 'requests-updated') return;
      fetchRequests();
      fetchAssets();
    };
  }

  // periodic refresh
  const refreshInterval = setInterval(() => {
    fetchRequests();
    fetchAssets();
  }, 10000);
  window.addEventListener('beforeunload', () => clearInterval(refreshInterval));

  // Kickoff
  fetchRequests();
  fetchAssets();
  fetchMaintenance();
});

