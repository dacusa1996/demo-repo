document.addEventListener('DOMContentLoaded', () => {
  // auth + storage
  const params = new URLSearchParams(window.location.search);
  const tabId = params.get('tabId') || window.name || crypto.randomUUID();
  window.name = tabId;
  const scopedGet = (k) => localStorage.getItem(`${k}_${tabId}`) || localStorage.getItem(k);
  const scopedRemove = (k) => { localStorage.removeItem(`${k}_${tabId}`); localStorage.removeItem(k); };

  const userRaw = scopedGet('admas_user');
  const token = scopedGet('admas_token');
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
  const apiBase = 'https://demo-repo-1-9qa0.onrender.com';

  // elements
  const userNameEl = document.getElementById('user-name');
  const userDeptEl = document.getElementById('user-dept');
  const headerSub = document.getElementById('header-sub');
  const logoutBtn = document.getElementById('logout-btn');
  const profileLink = document.getElementById('profile-link');
  const profileModal = document.getElementById('profile-modal');
  const profileClose = document.getElementById('profile-close');
  const pName = document.getElementById('p-name');
  const pEmail = document.getElementById('p-email');
  const pRole = document.getElementById('p-role');
  const pDept = document.getElementById('p-dept');
  const welcomeTitle = document.getElementById('welcome-title');

  const navItems = document.querySelectorAll('.nav-item[data-panel]');
  const panels = document.querySelectorAll('.content-panel');
  const queueTabs = document.querySelectorAll('#queue-tabs .chip, #queue-tabs-2 .chip');

  const kpiPending = document.getElementById('kpi-pending');
  const kpiApproved = document.getElementById('kpi-approved');
  const kpiRejected = document.getElementById('kpi-rejected');
  const kpiBorrowed = document.getElementById('kpi-borrowed');
  const kpiOverdue = document.getElementById('kpi-overdue');
  const kpiAvg = document.getElementById('kpi-avg');
  const kpiMonth = document.getElementById('kpi-month');

  const queueBody = document.getElementById('queue-body');
  const queueBody2 = document.getElementById('queue-body-2');
  const assetsBody = document.getElementById('assets-body');
  const assetsSearch = document.getElementById('assets-search');
  const assetsFilterDept = document.getElementById('assets-filter-dept');
  const assetsFilterStatus = document.getElementById('assets-filter-status');
  const activityBody = document.getElementById('activity-body');
  const activityBodyDash = document.getElementById('activity-body-dash');
  const riskBody = document.getElementById('risk-body');
  const riskHead = document.getElementById('risk-head');
  const riskTabs = document.querySelectorAll('#risk-tabs .chip');
  const topSearch = document.getElementById('top-search');
  const topSearchResults = document.getElementById('top-search-results');

  // state
  let allRequests = [];
  let viewRequests = [];
  let deptAssets = [];
  let currentQueueTab = 'PENDING';
  let cachedPending = [];
  let cachedApproved = [];
  let cachedRejected = [];
  let currentRiskTab = 'ALL';
  let maintenanceLogs = [];
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('admas-updates') : null;
  if (channel) {
    channel.onmessage = (e) => {
      const { type } = e.data || {};
      if (type === 'refresh') {
        fetchRequests();
        fetchAssets().then(() => fetchMaintenance());
      }
    };
  }

  const fmtDate = (v) => {
    if (!v) return '-';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString().slice(0, 10);
  };
  const deptLower = ((user.department || '') + '').toLowerCase().trim();

  // header
  if (userNameEl) userNameEl.textContent = user.name || 'Dept Head';
  if (userDeptEl) userDeptEl.textContent = `Department: ${user.department || '-'}`;
  if (headerSub) headerSub.textContent = `Dept Head (${user.department || '-'})`;
  if (welcomeTitle) welcomeTitle.textContent = `Hi, ${user.name || 'Dept Head'}`;
  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    scopedRemove('admas_user');
    scopedRemove('admas_token');
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
  });
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (pName) pName.textContent = user.name || '-';
      if (pEmail) pEmail.textContent = user.email || '-';
      if (pRole) pRole.textContent = user.role || 'Dept Head';
      if (pDept) pDept.textContent = user.department || '-';
      if (profileModal) profileModal.classList.add('open');
    });
  }
  if (profileClose && profileModal) profileClose.addEventListener('click', () => profileModal.classList.remove('open'));
  if (profileModal) profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.remove('open'); });

  // search helpers
  const hideSearchResults = () => {
    if (topSearchResults) {
      topSearchResults.innerHTML = '';
      topSearchResults.hidden = true;
    }
  };

  const jumpToPanel = (panel) => {
    navItems.forEach((n) => n.classList.toggle('active', n.dataset.panel === panel));
    panels.forEach((p) => p.classList.remove('active'));
    const el = document.getElementById(`panel-${panel}`);
    if (el) el.classList.add('active');
  };

  // nav
  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach((n) => n.classList.remove('active'));
      item.classList.add('active');
      const target = item.dataset.panel;
      panels.forEach((p) => p.classList.remove('active'));
      const panelEl = document.getElementById(`panel-${target}`);
      if (panelEl) panelEl.classList.add('active');
      hideSearchResults();
    });
  });

  // panel jump links (e.g., View Details, View Upcoming)
  const jumpLinks = document.querySelectorAll('[data-panel-jump]');
  jumpLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.dataset.panelJump;
      if (!target) return;
      navItems.forEach((n) => {
        n.classList.toggle('active', n.dataset.panel === target);
      });
      panels.forEach((p) => p.classList.remove('active'));
      const panelEl = document.getElementById(`panel-${target}`);
      if (panelEl) panelEl.classList.add('active');
      if (target === 'requests') {
        currentQueueTab = 'PENDING';
        document.querySelectorAll('[data-queue-tab]').forEach((c) => {
          c.classList.toggle('active', (c.dataset.queueTab || '') === 'PENDING');
        });
        renderQueue();
      }
    });
  });

  // rendering
  const renderKPIs = (pendingList, approvedList, rejectedList) => {
    const borrowedNow = deptAssets.filter((a) => (a.status || '').toLowerCase() === 'borrowed').length;
    const underMaint = deptAssets.filter((a) => (a.status || '').toLowerCase().includes('maint')).length;
    const overdue = viewRequests.filter((r) => {
      const status = (r.status || '').toUpperCase();
      if (status !== 'ISSUED' && status !== 'BORROWED') return false;
      if (!r.expected_return) return false;
      const due = new Date(r.expected_return);
      if (Number.isNaN(due.getTime())) return false;
      const today = new Date(); today.setHours(0,0,0,0);
      return due < today;
    }).length;
    const totalMonth = allRequests.length;
    if (kpiPending) kpiPending.textContent = pendingList.length;
    if (kpiApproved) kpiApproved.textContent = approvedList.length;
    if (kpiRejected) kpiRejected.textContent = rejectedList.length;
    if (kpiBorrowed) kpiBorrowed.textContent = underMaint;
    if (kpiOverdue) kpiOverdue.textContent = overdue;
    if (kpiMonth) kpiMonth.textContent = `${totalMonth} req`;
  };

  const renderQueue = () => {
    const filtered = viewRequests.filter((r) => (r.status || '').toUpperCase() === currentQueueTab);
    const purposeText = (r) => {
      const val = (r.reason || '').trim();
      return val ? val : 'No reason stated';
    };
    // compact table (dashboard)
    if (queueBody) {
      queueBody.innerHTML = '';
      if (!filtered.length) {
        queueBody.innerHTML = '<tr><td colspan="6">No requests.</td></tr>';
      } else {
        filtered.forEach((r) => {
          const actionHtml =
            currentQueueTab === 'PENDING'
              ? `<button class="pill-btn slim" data-action="approve" data-id="${r.id}">Approve</button>
                 <button class="pill-btn slim" data-action="reject" data-id="${r.id}">Reject</button>`
              : `<span class="muted">${(r.status || '-').toUpperCase()}</span>`;
          queueBody.innerHTML += `
            <tr>
              <td>${r.id}</td>
              <td>${r.asset_tag || '-'}</td>
              <td>${r.borrower_name || r.requested_by || '-'}</td>
              <td>${purposeText(r)}</td>
              <td>${fmtDate(r.expected_return)}</td>
              <td>${actionHtml}</td>
            </tr>
          `;
        });
      }
    }
    // full table (requests page)
    if (queueBody2) {
      queueBody2.innerHTML = '';
      if (!filtered.length) {
        queueBody2.innerHTML = '<tr><td colspan="6">No requests.</td></tr>';
      } else {
        filtered.forEach((r) => {
          queueBody2.innerHTML += `
            <tr>
              <td>${r.id}</td>
              <td>${r.asset_tag || '-'}</td>
              <td>${r.borrower_name || '-'}</td>
              <td>${purposeText(r)}</td>
              <td>${fmtDate(r.expected_return)}</td>
              <td><button class="pill-btn slim" data-action="review" data-id="${r.id}">Review</button></td>
            </tr>
          `;
        });
      }
    }
  };

  const renderRisk = () => {
    if (!riskBody || !riskHead) return;

    const overdueReqs = viewRequests.filter((r) => {
      const status = (r.status || '').toUpperCase();
      if (['RETURNED', 'REJECTED', 'CANCELLED'].includes(status)) return false;
      if (!r.expected_return) return false;
      const due = new Date(r.expected_return).getTime();
      return !Number.isNaN(due) && due < Date.now();
    });

    const waitingReqs = viewRequests.filter((r) => {
      const status = (r.status || '').toUpperCase();
      if (status !== 'PENDING') return false;
      if (!r.request_date) return false;
      const now = Date.now();
      const reqTime = new Date(r.request_date).getTime();
      return !Number.isNaN(reqTime) && (now - reqTime) > 1000 * 60 * 60 * 48;
    });

    const overdueCount = overdueReqs.length;
    const maintRows = maintenanceLogs;
    const maintCount = maintRows.length;
    const waitingCount = waitingReqs.length;

    riskBody.innerHTML = '';

    if (['OVERDUE', 'WAITING', 'MAINT'].includes(currentRiskTab)) {
      const list =
        currentRiskTab === 'OVERDUE'
          ? overdueReqs
          : currentRiskTab === 'WAITING'
            ? waitingReqs
            : maintRows;
      riskHead.innerHTML = `
        <tr>
          <th>${currentRiskTab === 'MAINT' ? 'Asset' : 'ReqID'}</th>
          <th>${currentRiskTab === 'MAINT' ? 'Issue' : 'Asset Tag'}</th>
          <th>${currentRiskTab === 'MAINT' ? 'Status' : 'Borrower'}</th>
          <th>${currentRiskTab === 'MAINT' ? 'Logged By' : 'Dept'}</th>
          <th>${currentRiskTab === 'MAINT' ? 'Action' : 'Due'}</th>
        </tr>
      `;
      if (!list.length) {
        riskBody.innerHTML = `<tr><td colspan="5">No ${currentRiskTab === 'OVERDUE' ? 'overdue' : currentRiskTab === 'WAITING' ? 'waiting' : 'maintenance'} items.</td></tr>`;
        return;
      }
      list.forEach((r) => {
        if (currentRiskTab === 'MAINT') {
          riskBody.innerHTML += `
            <tr>
              <td>${r.asset_tag || r.asset || '-'}</td>
              <td>${r.issue || '-'}</td>
              <td>${r.status || '-'}</td>
              <td>${r.logged_by_name || r.reported_by_name || r.logged_by || '-'}</td>
              <td>-</td>
            </tr>
          `;
        } else {
          riskBody.innerHTML += `
            <tr>
              <td>${r.id}</td>
              <td>${r.asset_tag || '-'}</td>
              <td>${r.borrower_name || '-'}</td>
              <td>${r.borrower_department || '-'}</td>
              <td>${fmtDate(r.expected_return)}</td>
            </tr>
          `;
        }
      });
      return;
    }

    // ALL / MAINT summary view
    riskHead.innerHTML = `
      <tr>
        <th>Category</th>
        <th>Count</th>
      </tr>
    `;
    const rows = [
      { key: 'OVERDUE', label: 'Overdue assets', count: overdueCount },
      { key: 'WAITING', label: 'Requests waiting > 48 hours', count: waitingCount },
      { key: 'MAINT', label: 'Asset maintenance', count: maintCount },
    ];
    const filtered = currentRiskTab === 'ALL' ? rows : rows.filter((r) => r.key === currentRiskTab);
    if (!filtered.length) {
      riskBody.innerHTML = '<tr><td colspan="2">No items.</td></tr>';
      return;
    }
    filtered.forEach((r) => {
      riskBody.innerHTML += `<tr><td>${r.label}</td><td>${r.count}</td></tr>`;
    });
  };

  const renderAssets = () => {
    if (!assetsBody) return;
    assetsBody.innerHTML = '';
    if (!deptAssets.length) {
      assetsBody.innerHTML = '<tr><td colspan="5">No assets found.</td></tr>';
      return;
    }
    const term = ((assetsSearch && assetsSearch.value) || '').toLowerCase().trim();
    const statusFilter = ((assetsFilterStatus && assetsFilterStatus.value) || '').toLowerCase();
    const deptFilter = ((assetsFilterDept && assetsFilterDept.value) || '').toLowerCase();
    const filtered = deptAssets.filter((a) => {
      const matchTerm = !term || (a.asset_tag || '').toLowerCase().includes(term) || (a.name || '').toLowerCase().includes(term);
      const dep = (a.department || a.department_name || a.dept || '').toLowerCase();
      const matchDept = !deptFilter || dep === deptFilter;
      const activeReq = allRequests.find((r) => Number(r.asset_id) === Number(a.id) && ['BORROWED', 'ISSUED', 'APPROVED'].includes((r.status || '').toUpperCase()));
      const baseStatus = (a.status || '').toLowerCase();
      const derivedStatus = activeReq ? 'borrowed' : baseStatus;
      const matchStatus = !statusFilter || derivedStatus.includes(statusFilter);
      return matchTerm && matchDept && matchStatus;
    });
    if (!filtered.length) {
      assetsBody.innerHTML = '<tr><td colspan="5">No assets found.</td></tr>';
      return;
    }
    const activeRequestForAsset = (assetId) => {
      const target = Number(assetId);
      if (Number.isNaN(target)) return null;
      return allRequests.find((r) => Number(r.asset_id) === target && ['BORROWED', 'ISSUED', 'APPROVED'].includes((r.status || '').toUpperCase()));
    };
    filtered.forEach((a) => {
      const activeReq = activeRequestForAsset(a.id);
      const baseStatus = (a.status || '').toLowerCase();
      const derivedStatus = activeReq ? 'borrowed' : baseStatus;
      const borrower = activeReq ? (activeReq.borrower_name || activeReq.requested_by || '-') : '-';
      assetsBody.innerHTML += `
        <tr>
          <td>${a.asset_tag || '-'}</td>
          <td>${a.name || '-'}</td>
          <td>${derivedStatus || a.status || '-'}</td>
          <td>${a.cond || '-'}</td>
          <td>${borrower}</td>
        </tr>
      `;
    });
  };

  const renderActivity = () => {
    const targets = [activityBodyDash, activityBody];
    const stamp = (r) => r.return_date || r.issued_at || r.approved_at || r.request_date || '';
    const recent = [...viewRequests]
      .sort((a, b) => new Date(stamp(b)) - new Date(stamp(a)))
      .slice(0, 20);
    targets.forEach((body) => {
      if (!body) return;
      body.innerHTML = '';
      if (!recent.length) {
        body.innerHTML = '<tr><td colspan="4">No activity yet.</td></tr>';
        return;
      }
      recent.forEach((r) => {
        body.innerHTML += `
          <tr>
            <td>${fmtDate(stamp(r))}</td>
            <td>${(r.status || '').toUpperCase()}</td>
            <td>${r.asset_tag || r.asset_name || '-'}</td>
            <td>${r.id ? `REQ-${r.id}` : '-'}</td>
          </tr>
        `;
      });
    });
  };

  const renderTopSearch = () => {
    if (!topSearch || !topSearchResults) return;
    const term = (topSearch.value || '').toLowerCase().trim();
    if (term.length < 2) {
      hideSearchResults();
      return;
    }
    const assetsMatches = deptAssets
      .filter((a) => `${a.asset_tag || ''} ${a.name || ''}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((a) => ({
        type: 'asset',
        label: `${a.asset_tag || '-'} · ${a.name || '-'}`,
        id: a.id,
        search: a.asset_tag || a.name || ''
      }));
    const requestMatches = viewRequests
      .filter((r) => `${r.asset_tag || ''} ${r.borrower_name || ''} ${r.reason || ''}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((r) => ({
        type: 'request',
        label: `Req #${r.id} · ${r.asset_tag || '-'} · ${r.borrower_name || '-'}`,
        id: r.id
      }));
    const combined = [...assetsMatches, ...requestMatches].slice(0, 8);
    if (!combined.length) {
      hideSearchResults();
      return;
    }
    topSearchResults.innerHTML = combined.map((item) => {
      return `<div class="search-item" data-type="${item.type}" data-id="${item.id}" data-search="${item.search || ''}">${item.label}</div>`;
    }).join('');
    topSearchResults.hidden = false;
  };

  // data
  const fetchAssets = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error((data && data.error) || 'Failed to load assets');
      const assets = (data.data && data.data.assets) || data.assets || [];
      // Show all assets like clerk; user can filter via toolbar.
      deptAssets = assets;
      // populate dept filter options to mirror clerk assets view
      if (assetsFilterDept) {
        const seen = new Set();
        assetsFilterDept.innerHTML = '<option value=\"\">Dept</option>';
        deptAssets.forEach((a) => {
          const depRaw = (a.department || a.department_name || a.dept || '').trim();
          if (!depRaw) return;
          const key = depRaw.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            assetsFilterDept.innerHTML += `<option value=\"${key}\">${depRaw}</option>`;
          }
        });
      }
      renderAssets();
    } catch (err) {
      if (assetsBody) assetsBody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
    }
  };

  const fetchMaintenance = async () => {
    try {
      const res = await fetch(`${apiBase}/api/maintenance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error((data && data.error) || 'Failed to load maintenance');
      const rows = (data.data && data.data.maintenance) || data.maintenance || [];
      // Show all maintenance items (no department filtering) to avoid hiding valid rows
      maintenanceLogs = rows.map((m) => ({
        ...m,
        logged_by_name: m.reported_by_name || m.logged_by || ''
      }));
      renderRisk();
    } catch (err) {
      // keep silent failure to not block page
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${apiBase}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error((data && data.error) || 'Failed to load requests');
      const reqs = (data.data && data.data.requests) || data.requests || [];
      allRequests = reqs; // keep full set for borrower lookup
      viewRequests = reqs.filter((r) => {
        const dep = (r.creator_department || r.borrower_department || '').toLowerCase().trim();
        return !deptLower || dep === deptLower;
      });
      cachedPending = viewRequests.filter((r) => (r.status || '').toUpperCase() === 'PENDING');
      cachedApproved = viewRequests.filter((r) => (r.status || '').toUpperCase() === 'APPROVED');
      cachedRejected = viewRequests.filter((r) => (r.status || '').toUpperCase() === 'REJECTED');
      renderKPIs(cachedPending, cachedApproved, cachedRejected);
      renderQueue();
      renderActivity();
      renderRisk();
    } catch (err) {
      if (queueBody) queueBody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
      if (queueBody2) queueBody2.innerHTML = `<tr><td colspan="8">${err.message}</td></tr>`;
    }
  };

  // listeners
  queueTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.queueTab || 'PENDING';
      currentQueueTab = tab;
      document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
      document.querySelectorAll(`[data-queue-tab="${tab}"]`).forEach((c) => c.classList.add('active'));
      renderQueue();
    });
  });

  const handleActionClick = async (btn) => {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    let status = null;
    let comment = '';
    if (action === 'approve') status = 'APPROVED';
    else if (action === 'reject') status = 'REJECTED';
    else if (action === 'review') {
      const approve = confirm('Approve this request? Click Cancel to reject.');
      status = approve ? 'APPROVED' : 'REJECTED';
      if (!approve) comment = prompt('Optional comment?','') || '';
    }
    if (!status) return;
    if (action === 'reject') {
      comment = prompt('Optional comment?','') || '';
    }
    btn.disabled = true;
    try {
      const res = await fetch(`${apiBase}/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status, comment })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error((data && data.error) || 'Failed to update');
      await fetchRequests();
      await fetchAssets();
    } catch (err) {
      alert(err.message || 'Failed to update request');
    } finally {
      btn.disabled = false;
    }
  };

  if (queueBody) {
    queueBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action][data-id]');
      if (!btn) return;
      handleActionClick(btn);
    });
  }
  if (queueBody2) {
    queueBody2.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action][data-id]');
      if (!btn) return;
      handleActionClick(btn);
    });
  }

  if (riskTabs) {
    riskTabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        riskTabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentRiskTab = btn.dataset.riskTab || 'ALL';
        renderRisk();
      });
    });
  }
  if (topSearch) {
    topSearch.addEventListener('input', renderTopSearch);
    topSearch.addEventListener('focus', renderTopSearch);
  }
  if (topSearchResults) {
    topSearchResults.addEventListener('click', (e) => {
      const item = e.target.closest('.search-item');
      if (!item) return;
      const type = item.dataset.type;
      const searchVal = item.dataset.search || '';
      hideSearchResults();
      if (type === 'asset') {
        if (assetsSearch) {
          assetsSearch.value = searchVal;
          renderAssets();
        }
        jumpToPanel('assets');
      } else if (type === 'request') {
        currentQueueTab = 'PENDING';
        document.querySelectorAll('[data-queue-tab]').forEach((c) => {
          c.classList.toggle('active', (c.dataset.queueTab || '') === 'PENDING');
        });
        renderQueue();
        jumpToPanel('requests');
      }
    });
  }
  if (assetsSearch) assetsSearch.addEventListener('input', renderAssets);
  if (assetsFilterDept) assetsFilterDept.addEventListener('change', renderAssets);
  if (assetsFilterStatus) assetsFilterStatus.addEventListener('change', renderAssets);

  if (topSearchResults) {
    document.addEventListener('click', (e) => {
      if (!topSearchResults.contains(e.target) && e.target !== topSearch) {
        hideSearchResults();
      }
    });
  }

  const refreshInterval = setInterval(() => {
    fetchRequests();
    fetchAssets().then(() => fetchMaintenance());
  }, 10000);
  window.addEventListener('beforeunload', () => clearInterval(refreshInterval));

  // kick off
  fetchAssets().then(() => fetchMaintenance());
  fetchRequests();
});







