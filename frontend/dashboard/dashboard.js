document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const qpTab = params.get('tabId');
  const tabId = qpTab || window.name || crypto.randomUUID();
  window.name = tabId;
  const computeBaseRoot = () => {
    if (window.location.protocol === 'file:') {
      return 'file:///C:/codin/final%203/final-project-admas/frontend';
    }
    const path = window.location.pathname;
    const frontendIndex = path.indexOf('/frontend/');
    if (frontendIndex !== -1) {
      return `${window.location.origin}${path.slice(0, frontendIndex + '/frontend'.length)}`;
    }
    const markers = ['/login/', '/dashboard/', '/clerk/', '/dept-head/', '/admin/', '/profile/', '/reports/', '/maintenance/'];
    let cutIndex = -1;
    for (const marker of markers) {
      const idx = path.indexOf(marker);
      if (idx !== -1 && (cutIndex === -1 || idx < cutIndex)) {
        cutIndex = idx;
      }
    }
    if (cutIndex !== -1) {
      return `${window.location.origin}${path.slice(0, cutIndex)}`;
    }
    return window.location.origin;
  };
  const baseRoot = computeBaseRoot();
  const getScoped = (key) => localStorage.getItem(`${key}_${tabId}`) || localStorage.getItem(key);
  const removeScoped = (key) => {
    localStorage.removeItem(`${key}_${tabId}`);
    localStorage.removeItem(key);
  };
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('admas-updates') : null;
  const userRaw = getScoped('admas_user');
  const token = getScoped('admas_token');

  if (!userRaw || !token) {
    window.location.href = `${baseRoot || ''}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch (err) {
    window.location.href = `${baseRoot || ''}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  // Build API base from current host so it survives IP changes
  // Use the same port as other frontends (53308) unless overridden
  const apiPort = '53308';
  const apiBase = 'https://demo-repo-1-9qa0.onrender.com';
  const apiFetch = async (path, options = {}) => {
    const headers = Object.assign(
      { 'Content-Type': 'application/json' },
      options.headers || {},
      token ? { Authorization: `Bearer ${token}` } : {}
    );
    const res = await fetch(`${apiBase}${path}`, { ...options, headers });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.success === false) {
      throw new Error((data && data.error) || 'Request failed');
    }
    return data;
  };
  const userNameEl = document.getElementById('user-name');
  const welcomeTitleEl = document.getElementById('welcome-title');
  const userRoleEl = document.getElementById('user-role');
  const logoutBtn = document.getElementById('logout-btn');
  const kpiEls = {
    total: document.getElementById('kpi-total'),
    available: document.getElementById('kpi-available'),
    borrowed: document.getElementById('kpi-borrowed'),
    maintenance: document.getElementById('kpi-maintenance'),
    overdue: document.getElementById('kpi-overdue')
  };
  const activityBody = document.getElementById('activity-body');
  const pendingBody = document.getElementById('pending-body');
  const quickActionBtns = document.querySelectorAll('.pill-btn[data-action]');
  const profileLink = document.getElementById('profile-link');
  const profileModal = document.getElementById('profile-modal');
  const profileClose = document.getElementById('profile-close');
  const pName = document.getElementById('p-name');
  const pEmail = document.getElementById('p-email');
  const pRole = document.getElementById('p-role');
  const pDept = document.getElementById('p-dept');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const addAssetModal = document.getElementById('add-asset-modal');
  const addAssetClose = document.getElementById('add-asset-close');
  const addAssetCancel = document.getElementById('add-asset-cancel');
  const addAssetForm = document.getElementById('add-asset-form');
  const addAssetIdField = document.getElementById('asset-id-field');
  const addUserModal = document.getElementById('add-user-modal');
  const addUserClose = document.getElementById('add-user-close');
  const addUserCancel = document.getElementById('add-user-cancel');
  const addUserForm = document.getElementById('add-user-form');
  const addUserIdField = document.getElementById('user-id-field');
  const addUserPassword = addUserForm ? addUserForm.querySelector('[name="password"]') : null;
  const addUserTitle = document.getElementById('add-user-title');
  const borrowNewBtn = document.getElementById('borrow-new-btn');
  const borrowModal = document.getElementById('borrow-modal');
  const borrowClose = document.getElementById('borrow-close');
  const borrowCancel = document.getElementById('borrow-cancel');
  const borrowForm = document.getElementById('borrow-form');
  const borrowAsset = document.getElementById('borrow-asset');
  const borrowBorrower = document.getElementById('borrow-borrower');
  const borrowDept = document.getElementById('borrow-dept');
  const borrowReturn = document.getElementById('borrow-return');
  const borrowReason = document.getElementById('borrow-reason');
  const borrowMsg = document.getElementById('borrow-msg');
  const maintNewBtn = document.getElementById('maint-new-btn');
  const maintModal = document.getElementById('maint-modal');
  const maintClose = document.getElementById('maint-close');
  const maintCancel = document.getElementById('maint-cancel');
  const maintForm = document.getElementById('maint-form');
  const maintAsset = document.getElementById('maint-asset');
  const maintIssue = document.getElementById('maint-issue');
  const maintMsg = document.getElementById('maint-msg');
  const reportStart = document.getElementById('report-start');
  const reportEnd = document.getElementById('report-end');
  const reportDept = document.getElementById('report-dept');
  const reportCategory = document.getElementById('report-category');
  const reportGenerate = document.getElementById('report-generate');
  const reportAssetsBody = document.getElementById('report-assets-body');
  const reportRequestsBody = document.getElementById('report-requests-body');
  const repOverdue = document.getElementById('rep-overdue');
  const repMaint = document.getElementById('rep-maint');
  const topSearch = document.getElementById('top-search');
  const topSearchResults = document.getElementById('top-search-results');
  const navItems = document.querySelectorAll('.nav-item');
  const notifyBtn = document.getElementById('notify-btn');
  const notifyBadge = document.getElementById('notify-badge');
  const resetModal = document.getElementById('reset-modal');
  const resetClose = document.getElementById('reset-close');
  const resetBody = document.getElementById('reset-body');
  const resetSetModal = document.getElementById('reset-set-modal');
  const resetSetClose = document.getElementById('reset-set-close');
  const resetSetCancel = document.getElementById('reset-set-cancel');
  const resetSetForm = document.getElementById('reset-set-form');
  const resetSetId = document.getElementById('reset-set-id');
  const resetSetEmail = document.getElementById('reset-set-email');
  const resetSetPassword = document.getElementById('reset-set-password');
  const resetSetMsg = document.getElementById('reset-set-msg');
  const panels = {
    dashboard: document.getElementById('panel-dashboard'),
    assets: document.getElementById('panel-assets'),
    borrowing: document.getElementById('panel-borrowing'),
    maintenance: document.getElementById('panel-maintenance'),
    users: document.getElementById('panel-users'),
    reports: document.getElementById('panel-reports')
  };
  const assetSearch = document.getElementById('assets-search');
  const assetFilterDept = document.getElementById('assets-filter-dept');
  const assetFilterCat = document.getElementById('assets-filter-cat');
  const assetFilterStatus = document.getElementById('assets-filter-status');
  const userSearch = document.querySelector('#panel-users .top-search');
  const userFilterRole = document.querySelector('#panel-users select:nth-of-type(1)');
  const userFilterDept = document.querySelector('#panel-users select:nth-of-type(2)');
  const userFilterStatus = document.querySelector('#panel-users select:nth-of-type(3)');
  const assetsTableBody = document.getElementById('assets-body-table');
  const borrowTableBody = document.getElementById('borrow-table');
  const maintTableBody = document.getElementById('maint-table');
  const usersTableBody = document.getElementById('users-table');
  const borrowChips = document.querySelectorAll('#panel-borrowing .chip');
  const maintChips = document.querySelectorAll('#panel-maintenance .chip');
  let requestsCache = [];
  let currentMaintFilter = '';
  let currentBorrowFilter = '';
  let resetCache = [];

  userNameEl.textContent = user.name || 'User';
  welcomeTitleEl.textContent = `Hi, ${user.name || 'there'}!`;
  userRoleEl.textContent = `Role: ${user.role || 'Admin'}`;

  logoutBtn.addEventListener('click', () => {
    removeScoped('admas_token');
    removeScoped('admas_user');
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
  });

  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (profileModal) {
        pName.textContent = user.name || '-';
        pEmail.textContent = user.email || '-';
        pRole.textContent = user.role || '-';
        pDept.textContent = user.department || '-';
        profileModal.classList.add('open');
      }
    });
  }
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) profileModal.classList.remove('open');
    });
  }
  if (profileClose) {
    profileClose.addEventListener('click', () => profileModal.classList.remove('open'));
  }
  const openResetModal = () => {
    if (resetModal) {
      resetModal.classList.add('open');
      document.body.classList.add('modal-open');
    }
  };
  const closeResetModal = () => {
    if (resetModal) resetModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };
  const openResetSetModal = (id, email) => {
    if (!resetSetModal) return;
    if (resetSetId) resetSetId.value = id || '';
    if (resetSetEmail) resetSetEmail.textContent = email || '';
    if (resetSetPassword) resetSetPassword.value = '';
    if (resetSetMsg) resetSetMsg.textContent = '';
    resetSetModal.classList.add('open');
    document.body.classList.add('modal-open');
    if (resetSetPassword) resetSetPassword.focus();
  };
  const closeResetSetModal = () => {
    if (resetSetModal) resetSetModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  const closeSidebar = () => document.body.classList.remove('sidebar-open');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeSidebar);
  }

  function setKpis(counts) {
    if (!kpiEls.total) return;
    kpiEls.total.textContent = counts.total;
    kpiEls.available.textContent = counts.available;
    kpiEls.borrowed.textContent = counts.borrowed;
    kpiEls.maintenance.textContent = counts.maintenance;
    kpiEls.overdue.textContent = counts.overdue;
  }

  function renderActivity(items) {
    if (!activityBody) return;
    activityBody.innerHTML = '';
    if (!items.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 4;
      cell.textContent = 'No recent activity.';
      row.appendChild(cell);
      activityBody.appendChild(row);
      return;
    }
    items.slice(0, 10).forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.date}</td>
        <td>${item.action}</td>
        <td>${item.asset}</td>
        <td>${item.user}</td>
      `;
      activityBody.appendChild(row);
    });
  }

  function renderPending(items) {
    if (!pendingBody) return;
    pendingBody.innerHTML = '';
    if (!items.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.textContent = 'No pending requests.';
      row.appendChild(cell);
      pendingBody.appendChild(row);
      return;
    }
    items.slice(0, 8).forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.id}</td>
        <td>${item.asset}</td>
        <td>${item.requestedBy}</td>
        <td>${item.department}</td>
        <td>${item.date}</td>
        <td>${item.status}</td>
        <td><button class="pill-btn slim btn-pending-view" data-id="${item.id}" type="button">View</button></td>
      `;
      pendingBody.appendChild(row);
    });

    document.querySelectorAll('.btn-pending-view').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const req = (requestsCache || []).find((r) => String(r.id) === String(id));
        if (!req) return;
        panels.dashboard && panels.dashboard.classList.remove('active');
        panels.borrowing && panels.borrowing.classList.add('active');
        navItems.forEach((n) => n.classList.remove('active'));
        const targetNav = Array.from(navItems).find((n) => (n.dataset.link || '') === 'borrowing');
        if (targetNav) targetNav.classList.add('active');
        currentBorrowFilter = 'PENDING';
        borrowChips.forEach((c) => {
          const label = (c.textContent || '').trim().toUpperCase();
          c.classList.toggle('active', label === 'PENDING');
        });
        applyBorrowFilters();
      };
    });
  }
  let assetsCache = [];
  let maintenanceCache = [];
  let usersCache = [];

  function renderAssetsTable(list) {
    if (!assetsTableBody) return;
    assetsTableBody.innerHTML = '';
    if (!list.length) {
      const row = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No assets found.';
      row.appendChild(td);
      assetsTableBody.appendChild(row);
      return;
    }
    list.forEach((a) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${a.asset_tag || '-'}</td>
        <td>${a.name || '-'}</td>
        <td>${a.department || '-'}</td>
        <td>${a.cond || a.condition || '-'}</td>
        <td>${a.status || '-'}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="pill-btn slim btn-asset-edit" data-id="${a.id}" type="button">Edit</button>
            <button class="pill-btn slim danger btn-asset-delete" data-id="${a.id}" type="button">Delete</button>
          </div>
        </td>
      `;
      assetsTableBody.appendChild(row);
    });

    attachAssetActions();
  }

  function refreshAssetFilterOptions() {
    if (!assetsCache || !assetsCache.length) return;
    const deptVal = assetFilterDept ? assetFilterDept.value : '';
    const catVal = assetFilterCat ? assetFilterCat.value : '';
    const depts = new Set();
    const cats = new Set();
    assetsCache.forEach((a) => {
      if (a.department) depts.add(a.department);
      if (a.category) cats.add(a.category);
    });
    if (assetFilterDept) {
      assetFilterDept.innerHTML = '<option value=\"\">Dept</option>' + Array.from(depts).map((d) => `<option value=\"${d}\">${d}</option>`).join('');
      assetFilterDept.value = deptVal;
    }
    if (assetFilterCat) {
      assetFilterCat.innerHTML = '<option value=\"\">Category</option>' + Array.from(cats).map((c) => `<option value=\"${c}\">${c}</option>`).join('');
      assetFilterCat.value = catVal;
    }
  }

  function applyAssetFilters() {
    let list = assetsCache || [];
    const term = assetSearch ? assetSearch.value.trim().toLowerCase() : '';
    const dept = assetFilterDept ? assetFilterDept.value : '';
    const cat = assetFilterCat ? assetFilterCat.value : '';
    const status = assetFilterStatus ? assetFilterStatus.value : '';

    if (term) {
      list = list.filter((a) => {
        return [a.name, a.asset_tag, a.category, a.department].some((field) =>
          (field || '').toLowerCase().includes(term)
        );
      });
    }
    if (dept) list = list.filter((a) => (a.department || '') === dept);
    if (cat) list = list.filter((a) => (a.category || '') === cat);
    if (status) list = list.filter((a) => (a.status || '').toLowerCase() === status.toLowerCase());

    renderAssetsTable(list);
  }

  function attachAssetActions() {
    document.querySelectorAll('.btn-asset-edit').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const asset = assetsCache.find((a) => String(a.id) === String(id));
        if (asset) openEditAsset(asset);
      };
    });
    document.querySelectorAll('.btn-asset-delete').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!id) return;
        const ok = confirm('Delete this asset?');
        if (!ok) return;
        try {
          await apiFetch(`/api/assets/${id}`, { method: 'DELETE' });
          await fetchAssetsPanel();
        } catch (err) {
          alert(err.message || 'Failed to delete asset');
        }
      };
    });
  }

  function renderBorrowTable(list) {
    if (!borrowTableBody) return;
    borrowTableBody.innerHTML = '';
    if (!list.length) {
      const row = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'No requests found.';
      row.appendChild(td);
      borrowTableBody.appendChild(row);
      return;
    }
    list.forEach((r) => {
      const row = document.createElement('tr');
      const status = (r.status || '').toUpperCase();
      let actionCell = '-';
      if (status === 'PENDING') {
        actionCell = `
          <div class="actions actions-pill">
            <button class="pill-btn slim success btn-req-approve" data-id="${r.id}" type="button">Approve</button>
            <button class="pill-btn slim danger btn-req-reject" data-id="${r.id}" type="button">Reject</button>
          </div>
        `;
      }
      row.innerHTML = `
        <td>${r.id}</td>
        <td>${r.asset_tag || r.asset_name || '-'}</td>
        <td>${r.borrower_name || r.requested_by || '-'}</td>
        <td>${r.borrower_department || r.department || '-'}</td>
        <td>${r.expected_return || '-'}</td>
        <td>${r.status || '-'}</td>
        <td>${actionCell}</td>
      `;
      borrowTableBody.appendChild(row);
    });

    document.querySelectorAll('.btn-req-approve').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!id) return;
        try {
          await apiFetch(`/api/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'APPROVED' })
          });
          const idx = requestsCache.findIndex((r) => String(r.id) === String(id));
          if (idx !== -1) requestsCache[idx].status = 'APPROVED';
          fetchDashboard();
        } catch (err) {
          alert(err.message || 'Failed to approve request');
        }
      };
    });
    document.querySelectorAll('.btn-req-reject').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!id) return;
        const ok = confirm('Reject this request?');
        if (!ok) return;
        try {
          await apiFetch(`/api/requests/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'REJECTED' })
          });
          const idx = requestsCache.findIndex((r) => String(r.id) === String(id));
          if (idx !== -1) requestsCache[idx].status = 'REJECTED';
          fetchDashboard();
        } catch (err) {
          alert(err.message || 'Failed to reject request');
        }
      };
    });
  }

  function applyBorrowFilters() {
    let list = requestsCache || [];
    if (currentBorrowFilter) {
      const target = currentBorrowFilter.toUpperCase();
      list = list.filter((r) => (r.status || '').toUpperCase() === target);
    }
    renderBorrowTable(list);
  }

  function renderMaintenanceTable(list) {
    if (!maintTableBody) return;
    maintTableBody.innerHTML = '';
    if (!list.length) {
      const row = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.textContent = 'No maintenance records.';
      row.appendChild(td);
      maintTableBody.appendChild(row);
      return;
    }
    list.forEach((m) => {
      const loggedBy = m.reported_by_name || m.logged_by_name || m.logged_by || '-';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${m.asset_tag || m.asset || '-'}</td>
        <td>${m.issue || '-'}</td>
        <td>${m.status || '-'}</td>
        <td class="muted">${loggedBy}</td>
      `;
      maintTableBody.appendChild(row);
    });
  }

  function applyMaintenanceFilters() {
    let list = maintenanceCache || [];
    if (currentMaintFilter) {
      const target = currentMaintFilter.toUpperCase();
      list = list.filter((m) => {
        const status = (m.status || '').toUpperCase();
        if (target === 'OPEN') return status === 'OPEN' || status === 'PENDING';
        if (target === 'IN PROGRESS') return status === 'IN_PROGRESS' || status === 'IN PROGRESS';
        if (target === 'COMPLETED') return status === 'COMPLETED';
        return status === target;
      });
    }
    renderMaintenanceTable(list);
  }

  function renderUsersTable(list) {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = '';
    if (!list.length) {
      const row = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.textContent = 'No users found.';
      row.appendChild(td);
      usersTableBody.appendChild(row);
      return;
    }
    list.forEach((u) => {
      const resolvedStatus = u.status !== undefined ? u.status : (u.is_active === 0 || u.is_active === false ? 'Disabled' : 'Active');
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${u.name || '-'}</td>
        <td>${u.email || '-'}</td>
        <td>${u.role || '-'}</td>
        <td>${u.department || '-'}</td>
        <td>${resolvedStatus}</td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="pill-btn slim btn-user-edit" data-id="${u.id}" type="button">Edit</button>
            <button class="pill-btn slim danger btn-user-delete" data-id="${u.id}" type="button">Delete</button>
          </div>
        </td>
      `;
      usersTableBody.appendChild(row);
    });

    attachUserActions();
  }

  function refreshReportFilters() {
    if (reportDept && assetsCache.length) {
      const selected = reportDept.value;
      const depts = Array.from(new Set(assetsCache.map((a) => a.department).filter(Boolean)));
      reportDept.innerHTML = ['<option value=\"\">Dept</option>', ...depts.map((d) => `<option value=\"${d}\">${d}</option>`)].join('');
      reportDept.value = selected;
    }
    if (reportCategory && assetsCache.length) {
      const selected = reportCategory.value;
      const cats = Array.from(new Set(assetsCache.map((a) => a.category).filter(Boolean)));
      reportCategory.innerHTML = ['<option value=\"\">Category</option>', ...cats.map((c) => `<option value=\"${c}\">${c}</option>`)].join('');
      reportCategory.value = selected;
    }
  }

  function renderReports() {
    if (!reportAssetsBody || !reportRequestsBody) return;
    if (!assetsCache.length || !requestsCache.length) {
      if (reportAssetsBody) reportAssetsBody.innerHTML = '<tr><td colspan="2">Loading assets...</td></tr>';
      if (reportRequestsBody) reportRequestsBody.innerHTML = '<tr><td colspan="2">Loading requests...</td></tr>';
      if (repOverdue) repOverdue.textContent = '-';
      if (repMaint) repMaint.textContent = '-';
      return;
    }
    refreshReportFilters();
    const start = reportStart && reportStart.value ? new Date(reportStart.value) : null;
    const end = reportEnd && reportEnd.value ? new Date(reportEnd.value) : null;
    const dept = reportDept ? reportDept.value : '';
    const cat = reportCategory ? reportCategory.value : '';

    const assetsFiltered = assetsCache.filter((a) => {
      if (dept && (a.department || '') !== dept) return false;
      if (cat && (a.category || '') !== cat) return false;
      return true;
    });

    const deptCounts = {};
    assetsFiltered.forEach((a) => {
      const key = a.department || 'Unassigned';
      deptCounts[key] = (deptCounts[key] || 0) + 1;
    });
    reportAssetsBody.innerHTML = '';
    if (!assetsFiltered.length) {
      reportAssetsBody.innerHTML = '<tr><td colspan=\"2\">No assets found.</td></tr>';
    } else {
      Object.entries(deptCounts).forEach(([d, count]) => {
        reportAssetsBody.innerHTML += `<tr><td>${d}</td><td>${count}</td></tr>`;
      });
    }

    const withinRange = (date) => {
      if (!date) return true;
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return true;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    };

    const reqFiltered = requestsCache.filter((r) => {
      if (dept && (r.borrower_department || r.department || '') !== dept) return false;
      if (cat && (r.category || r.asset_category || '') !== cat) return false;
      return withinRange(r.request_date);
    });
    const statusCounts = {};
    reqFiltered.forEach((r) => {
      const s = (r.status || 'UNKNOWN').toUpperCase();
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    reportRequestsBody.innerHTML = '';
    if (!reqFiltered.length) {
      reportRequestsBody.innerHTML = '<tr><td colspan=\"2\">No requests found.</td></tr>';
    } else {
      Object.entries(statusCounts).forEach(([s, count]) => {
        reportRequestsBody.innerHTML += `<tr><td>${s}</td><td>${count}</td></tr>`;
      });
    }

    // Overdue & maintenance
    const now = Date.now();
    const overdueCount = reqFiltered.filter((r) => {
      const status = (r.status || '').toUpperCase();
      if (status !== 'ISSUED' && status !== 'BORROWED') return false;
      if (!r.expected_return) return false;
      const due = new Date(r.expected_return).getTime();
      return !Number.isNaN(due) && due < now;
    }).length;
    const maintCount = (maintenanceCache || []).filter((m) => {
      const s = (m.status || '').toUpperCase();
      return s === 'PENDING' || s === 'OPEN' || s === 'IN_PROGRESS';
    }).length;
    if (repOverdue) repOverdue.textContent = overdueCount;
    if (repMaint) repMaint.textContent = maintCount;
  }

  function attachUserActions() {
    document.querySelectorAll('.btn-user-edit').forEach((btn) => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const userRec = usersCache.find((u) => String(u.id) === String(id));
        if (userRec) openEditUser(userRec);
      };
    });
    document.querySelectorAll('.btn-user-delete').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        if (!id) return;
        const ok = confirm('Disable this user?');
        if (!ok) return;
        try {
          await apiFetch(`/api/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Disabled' })
          });
          fetchUsersPanel();
        } catch (err) {
          alert(err.message || 'Failed to update user');
        }
      };
    });
  }

  function refreshUserFilterOptions() {
    if (!usersCache || !usersCache.length) return;
    const roleVal = userFilterRole ? userFilterRole.value : '';
    const deptVal = userFilterDept ? userFilterDept.value : '';
    const statusVal = userFilterStatus ? userFilterStatus.value : '';
    const roles = new Set();
    const depts = new Set();
    usersCache.forEach((u) => {
      if (u.role) roles.add(u.role);
      if (u.department) depts.add(u.department);
    });
    if (userFilterRole) {
      userFilterRole.innerHTML = '<option value=\"\">Role</option>' + Array.from(roles).map((r) => `<option value=\"${r}\">${r}</option>`).join('');
      userFilterRole.value = roleVal;
    }
    if (userFilterDept) {
      userFilterDept.innerHTML = '<option value=\"\">Dept</option>' + Array.from(depts).map((d) => `<option value=\"${d}\">${d}</option>`).join('');
      userFilterDept.value = deptVal;
    }
    if (userFilterStatus) {
      userFilterStatus.innerHTML = `
        <option value=\"\">Status</option>
        <option value=\"Active\">Active</option>
        <option value=\"Disabled\">Disabled</option>
      `;
      userFilterStatus.value = statusVal;
    }
  }

  function applyUserFilters() {
    let list = usersCache || [];
    const term = userSearch ? userSearch.value.trim().toLowerCase() : '';
    const role = userFilterRole ? userFilterRole.value : '';
    const dept = userFilterDept ? userFilterDept.value : '';
    const status = userFilterStatus ? userFilterStatus.value : '';

    if (term) {
      list = list.filter((u) =>
        [u.name, u.email, u.department, u.role].some((f) => (f || '').toLowerCase().includes(term))
      );
    }
    if (role) list = list.filter((u) => (u.role || '') === role);
    if (dept) list = list.filter((u) => (u.department || '') === dept);
    if (status) list = list.filter((u) => (u.status || '') === status);

    renderUsersTable(list);
  }

  async function fetchDashboard() {
    setKpis({ total: 0, available: 0, borrowed: 0, maintenance: 0, overdue: 0 });
    try {
      const stats = await apiFetch('/api/dashboard/stats');
      if (stats && stats.data) {
        setKpis({
          total: stats.data.totalAssets || 0,
          available: stats.data.availableAssets || 0,
          borrowed: stats.data.borrowedAssets || 0,
          maintenance: stats.data.underMaintenance || 0,
          overdue: stats.data.overdueReturns || 0
        });
      }
      const recent = await apiFetch('/api/dashboard/recent');
      renderActivity((recent && recent.data) || []);
      const reqs = await apiFetch('/api/requests');
      const reqList = (reqs && reqs.data && reqs.data.requests) || reqs.requests || [];
      requestsCache = reqList;
      const mappedPending = reqList.filter((r) => (r.status || '').toUpperCase() === 'PENDING').slice(0, 6).map((r) => ({
        id: r.id,
        asset: r.asset_tag || r.asset_name || '-',
        requestedBy: r.borrower_name || r.requested_by || '-',
        department: r.borrower_department || r.department || '-',
        date: r.request_date || '',
        status: r.status || ''
      }));
      renderPending(mappedPending);
      // reuse requests for borrowing panel
      applyBorrowFilters();
      renderReports();
      await fetchMaintenancePanel();
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      alert(err.message || 'Failed to load dashboard data');
    }
  }

  async function fetchAssetsPanel() {
    try {
      const data = await apiFetch('/api/assets');
      const list = (data && data.data && data.data.assets) || data.assets || [];
      assetsCache = list;
      refreshAssetFilterOptions();
      applyAssetFilters();
    } catch (err) {
      console.error('Failed to load assets', err);
      if (assetsTableBody) assetsTableBody.innerHTML = `<tr><td colspan="6">Failed to load assets</td></tr>`;
    }
  }

  async function fetchMaintenancePanel() {
    try {
      const data = await apiFetch('/api/maintenance');
      maintenanceCache = (data && data.data && data.data.maintenance) || data.maintenance || [];
      applyMaintenanceFilters();
    } catch (err) {
      maintenanceCache = [];
      if (maintTableBody) maintTableBody.innerHTML = `<tr><td colspan="4">Failed to load maintenance</td></tr>`;
    }
  }

  async function fetchUsersPanel() {
    try {
      const data = await apiFetch('/api/users');
      const list = (data && data.data && data.data.users) || data.users || [];
      const mapped = list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || (u.role_name) || '-',
        department: u.department || '-',
        status: u.is_active === 0 || u.is_active === false ? 'Disabled' : 'Active',
        is_active: u.is_active
      }));
      usersCache = mapped;
      refreshUserFilterOptions();
      applyUserFilters();
    } catch (err) {
      console.error('Failed to load users', err);
      if (usersTableBody) usersTableBody.innerHTML = `<tr><td colspan="5">Failed to load users</td></tr>`;
    }
  }

  const openAddAsset = () => {
    if (addAssetIdField) addAssetIdField.value = '';
    if (addAssetForm) {
      addAssetForm.dataset.mode = 'add';
      addAssetForm.reset();
    }
    if (addAssetModal) {
      addAssetModal.classList.add('open');
      document.body.classList.add('modal-open');
      const firstInput = addAssetForm && addAssetForm.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }
  };

  const openAddUser = () => {
    if (addUserIdField) addUserIdField.value = '';
    if (addUserForm) {
      addUserForm.dataset.mode = 'add';
      addUserForm.reset();
      if (addUserPassword) {
        addUserPassword.required = true;
        addUserPassword.placeholder = '';
      }
    }
    if (addUserTitle) addUserTitle.textContent = 'Add User';
    if (addUserModal) {
      addUserModal.classList.add('open');
      document.body.classList.add('modal-open');
      const firstInput = addUserForm && addUserForm.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }
  };

  const openEditUser = (userRec) => {
    if (!addUserForm) return;
    addUserForm.dataset.mode = 'edit';
    if (addUserIdField) addUserIdField.value = userRec.id || '';
    if (addUserTitle) addUserTitle.textContent = 'Edit User';
    const setField = (name, val) => {
      const el = addUserForm.querySelector(`[name="${name}"]`);
      if (el) el.value = val ?? '';
    };
    setField('name', userRec.name || '');
    setField('email', userRec.email || '');
    setField('role', (userRec.role || '').toLowerCase());
    setField('department', userRec.department || '');
    setField('status', userRec.status || 'Active');
    if (addUserPassword) {
      addUserPassword.required = false;
      addUserPassword.value = '';
      addUserPassword.placeholder = 'Leave blank to keep current';
    }
    if (addUserModal) {
      addUserModal.classList.add('open');
      document.body.classList.add('modal-open');
      const firstInput = addUserForm.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }
  };

  const openEditAsset = (asset) => {
    if (!addAssetForm) return;
    addAssetForm.dataset.mode = 'edit';
    const setField = (name, val) => {
      const el = addAssetForm.querySelector(`[name="${name}"]`);
      if (el) el.value = val ?? '';
    };
    if (addAssetIdField) addAssetIdField.value = asset.id || '';
    setField('name', asset.name || '');
    setField('asset_tag', asset.asset_tag || '');
    setField('department', asset.department || '');
    setField('category', asset.category || '');
    setField('status', (asset.status || '').toLowerCase());
    setField('cond', (asset.cond || asset.condition || 'good').toLowerCase());
    setField('location', asset.location || '');
    setField('description', asset.description || '');
    if (asset.purchase_date) {
      setField('purchase_date', String(asset.purchase_date).slice(0, 10));
    } else {
      setField('purchase_date', '');
    }
    if (addAssetModal) {
      addAssetModal.classList.add('open');
      document.body.classList.add('modal-open');
      const firstInput = addAssetForm.querySelector('input, select, textarea');
      if (firstInput) firstInput.focus();
    }
  };

  const openBorrowModal = async () => {
    if (!assetsCache.length) await fetchAssetsPanel();
    if (borrowMsg) { borrowMsg.textContent = ''; borrowMsg.style.color = ''; }
    if (borrowForm) borrowForm.reset();
    if (borrowAsset) {
      const opts = assetsCache
        .filter((a) => (a.status || '').toLowerCase() === 'available')
        .map((a) => {
          const label = a.asset_tag ? `${a.asset_tag}${a.name ? ' · ' + a.name : ''}` : (a.name || '');
          return `<option value="${a.id}">${label || 'Unnamed asset'}</option>`;
        });
      borrowAsset.innerHTML = opts.length ? ['<option value="">Select asset</option>', ...opts].join('') : '<option value="">No available assets</option>';
      borrowAsset.disabled = !opts.length;
    }
    if (borrowModal) {
      borrowModal.classList.add('open');
      document.body.classList.add('modal-open');
    }
  };

  const closeBorrowModal = () => {
    if (borrowModal) borrowModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  const openMaintModal = async () => {
    if (!assetsCache.length) await fetchAssetsPanel();
    if (!maintenanceCache.length) await fetchMaintenancePanel();
    if (maintMsg) { maintMsg.textContent = ''; maintMsg.style.color = ''; }
    if (maintForm) maintForm.reset();
    if (maintAsset) {
      const openMaint = new Set(
        maintenanceCache
          .filter((m) => {
            const s = (m.status || '').toLowerCase();
            return s === 'pending' || s === 'open' || s === 'in_progress';
          })
          .map((m) => Number(m.asset_id))
      );
      const opts = assetsCache
        .filter((a) => {
          const status = (a.status || '').toLowerCase();
          if (status === 'borrowed') return false;
          if (status.includes('maint')) return false;
          if (openMaint.has(Number(a.id))) return false;
          return true;
        })
        .map((a) => {
          const label = a.asset_tag ? `${a.asset_tag}${a.name ? ' · ' + a.name : ''}` : (a.name || '');
          return `<option value="${a.id}">${label || 'Unnamed asset'}</option>`;
        });
      maintAsset.innerHTML = opts.length ? ['<option value="">Select asset</option>', ...opts].join('') : '<option value="">No eligible assets</option>';
      maintAsset.disabled = !opts.length;
    }
    if (maintModal) {
      maintModal.classList.add('open');
      document.body.classList.add('modal-open');
    }
  };

  const closeMaintModal = () => {
    if (maintModal) maintModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  quickActionBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'add-asset') {
        openAddAsset();
        return;
      }
      if (action === 'manage-users') {
        openAddUser();
        return;
      }
      if (action === 'issue-borrow') {
        openBorrowModal();
        return;
      }
      const q = `?tabId=${encodeURIComponent(tabId)}`;
      const routes = {
        'view-reports': `${baseRoot}/reports${q}`,
        'maintenance-overview': `${baseRoot}/maintenance${q}`,
        'clerk': `${baseRoot}/clerk/index.html${q}`,
        'dept-head': `${baseRoot}/dept-head/index.html${q}`
      };
      const target = routes[action];
      if (target) {
        window.location.href = target;
      }
    });
  });

  const hideSearchResults = () => {
    if (topSearchResults) {
      topSearchResults.innerHTML = '';
      topSearchResults.hidden = true;
    }
  };

  const renderTopSearch = () => {
    if (!topSearch || !topSearchResults) return;
    const term = (topSearch.value || '').toLowerCase().trim();
    if (term.length < 2) {
      hideSearchResults();
      return;
    }
    const assetMatches = (assetsCache || [])
      .filter((a) => `${a.asset_tag || ''} ${a.name || ''}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((a) => ({
        type: 'asset',
        label: `${a.asset_tag || '-'} · ${a.name || '-'}`,
        id: a.id,
        search: a.asset_tag || a.name || ''
      }));
    const userMatches = (usersCache || [])
      .filter((u) => `${u.name || ''} ${u.email || ''} ${u.department || ''}`.toLowerCase().includes(term))
      .slice(0, 5)
      .map((u) => ({
        type: 'user',
        label: `${u.name || '-'} · ${u.email || '-'}`,
        id: u.id,
        search: u.name || u.email || ''
      }));
    const combined = [...assetMatches, ...userMatches].slice(0, 8);
    if (!combined.length) {
      hideSearchResults();
      return;
    }
    topSearchResults.innerHTML = combined.map((item) => {
      return `<div class="search-item" data-type="${item.type}" data-id="${item.id}" data-search="${item.search || ''}">${item.label}</div>`;
    }).join('');
    topSearchResults.hidden = false;
  };

  // also open add modal for inline buttons
  document.querySelectorAll('[data-action="add-asset"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openAddAsset();
    });
  });

  document.querySelectorAll('[data-action="manage-users"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openAddUser();
    });
  });
  document.querySelectorAll('[data-action="issue-borrow"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBorrowModal();
    });
  });
  document.querySelectorAll('[data-action="issue-borrow"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBorrowModal();
    });
  });

  // asset filters
  [assetSearch, assetFilterDept, assetFilterCat, assetFilterStatus].forEach((el) => {
    if (!el) return;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => applyAssetFilters());
  });

  // user filters
  [userSearch, userFilterRole, userFilterDept, userFilterStatus].forEach((el) => {
    if (!el) return;
    const evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, () => applyUserFilters());
  });

  // borrowing status filters
  borrowChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const status = (chip.textContent || '').trim().toUpperCase();
      currentBorrowFilter = status;
      borrowChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      applyBorrowFilters();
    });
  });

  // maintenance status filters
  maintChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const status = (chip.textContent || '').trim();
      currentMaintFilter = status;
      maintChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      applyMaintenanceFilters();
    });
  });

  // borrow modal
  if (borrowNewBtn) borrowNewBtn.addEventListener('click', openBorrowModal);
  if (borrowClose) borrowClose.addEventListener('click', closeBorrowModal);
  if (borrowCancel) borrowCancel.addEventListener('click', closeBorrowModal);
  if (borrowModal) borrowModal.addEventListener('click', (e) => { if (e.target === borrowModal) closeBorrowModal(); });
  if (borrowForm) {
    borrowForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (borrowMsg) { borrowMsg.textContent = ''; borrowMsg.style.color = ''; }
      const payload = {
        asset_id: Number(borrowAsset && borrowAsset.value),
        borrower_name: borrowBorrower ? borrowBorrower.value.trim() : '',
        borrower_department: borrowDept ? borrowDept.value.trim() : '',
        expected_return: borrowReturn ? borrowReturn.value : null,
        reason: borrowReason ? borrowReason.value.trim() : ''
      };
      if (!payload.asset_id || !payload.borrower_name) {
        if (borrowMsg) { borrowMsg.textContent = 'Asset and borrower are required.'; borrowMsg.style.color = '#b91c1c'; }
        return;
      }
      try {
        await apiFetch('/api/requests', { method: 'POST', body: JSON.stringify(payload) });
        if (borrowMsg) { borrowMsg.textContent = 'Request created.'; borrowMsg.style.color = '#16a34a'; }
        await fetchDashboard();
        await fetchAssetsPanel();
        closeBorrowModal();
      } catch (err) {
        if (borrowMsg) { borrowMsg.textContent = err.message || 'Failed to create request'; borrowMsg.style.color = '#b91c1c'; }
      }
    });
  }

  // maintenance modal
  if (maintNewBtn) maintNewBtn.addEventListener('click', openMaintModal);
  if (maintClose) maintClose.addEventListener('click', closeMaintModal);
  if (maintCancel) maintCancel.addEventListener('click', closeMaintModal);
  if (maintModal) maintModal.addEventListener('click', (e) => { if (e.target === maintModal) closeMaintModal(); });
  if (maintForm) {
    maintForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (maintMsg) { maintMsg.textContent = ''; maintMsg.style.color = ''; }
      const payload = {
        asset_id: Number(maintAsset && maintAsset.value),
        issue: maintIssue ? maintIssue.value.trim() : ''
      };
      if (!payload.asset_id || !payload.issue) {
        if (maintMsg) { maintMsg.textContent = 'Asset and issue are required.'; maintMsg.style.color = '#b91c1c'; }
        return;
      }
      try {
        await apiFetch('/api/maintenance', { method: 'POST', body: JSON.stringify(payload) });
        if (maintMsg) { maintMsg.textContent = 'Maintenance logged.'; maintMsg.style.color = '#16a34a'; }
        await fetchMaintenancePanel();
        await fetchAssetsPanel();
        closeMaintModal();
      } catch (err) {
        if (maintMsg) { maintMsg.textContent = err.message || 'Failed to log maintenance'; maintMsg.style.color = '#b91c1c'; }
      }
    });
  }

  // reports filters
  if (reportGenerate) reportGenerate.addEventListener('click', renderReports);
  if (reportDept) reportDept.addEventListener('change', renderReports);
  if (reportCategory) reportCategory.addEventListener('change', renderReports);
  if (reportStart) reportStart.addEventListener('change', renderReports);
  if (reportEnd) reportEnd.addEventListener('change', renderReports);

  if (reportGenerate) reportGenerate.addEventListener('click', renderReports);
  if (reportDept) reportDept.addEventListener('change', renderReports);
  if (reportCategory) reportCategory.addEventListener('change', renderReports);
  if (reportStart) reportStart.addEventListener('change', renderReports);
  if (reportEnd) reportEnd.addEventListener('change', renderReports);

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
        if (assetSearch) assetSearch.value = searchVal;
        setActivePanel('assets');
        applyAssetFilters();
      } else if (type === 'user') {
        if (userSearch) userSearch.value = searchVal;
        setActivePanel('users');
        applyUserFilters();
      }
    });
    document.addEventListener('click', (e) => {
      if (!topSearchResults.contains(e.target) && e.target !== topSearch) {
        hideSearchResults();
      }
    });
  }

  const closeAddAsset = () => {
    if (addAssetModal) addAssetModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  if (addAssetModal) {
    addAssetModal.addEventListener('click', (e) => {
      if (e.target === addAssetModal) closeAddAsset();
    });
  }
  if (addAssetClose) addAssetClose.addEventListener('click', closeAddAsset);
  if (addAssetCancel) addAssetCancel.addEventListener('click', closeAddAsset);
  if (addAssetForm) {
    addAssetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addAssetForm);
      const payload = {
        name: fd.get('name') || '',
        asset_tag: fd.get('asset_tag') || '',
        department: fd.get('department') || '',
        category: fd.get('category') || '',
        status: (fd.get('status') || '').toLowerCase() || 'available',
        condition: (fd.get('cond') || '').toLowerCase() || 'good',
        location: fd.get('location') || '',
        description: fd.get('description') || '',
        purchase_date: fd.get('purchase_date') || null
      };
      const assetId = addAssetIdField ? addAssetIdField.value : '';
      const isEdit = addAssetForm.dataset.mode === 'edit' && assetId;
      try {
        if (isEdit) {
          await apiFetch(`/api/assets/${assetId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
        } else {
          await apiFetch('/api/assets', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }
        closeAddAsset();
        fetchAssetsPanel();
        setActivePanel('assets');
        alert(isEdit ? 'Asset updated.' : 'Asset added successfully.');
      } catch (err) {
        console.error('Create/update asset failed', err);
        alert(err.message || 'Failed to save asset');
      }
    });
  }

  const closeAddUser = () => {
    if (addUserModal) addUserModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  };

  if (addUserModal) {
    addUserModal.addEventListener('click', (e) => {
      if (e.target === addUserModal) closeAddUser();
    });
  }
  if (addUserClose) addUserClose.addEventListener('click', closeAddUser);
  if (addUserCancel) addUserCancel.addEventListener('click', closeAddUser);
  if (addUserForm) {
    addUserForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(addUserForm);
      const payload = {
        name: fd.get('name') || '',
        email: fd.get('email') || '',
        password: fd.get('password') || '',
        role: fd.get('role') || 'clerk',
        department: fd.get('department') || '',
        status: fd.get('status') || 'Active'
      };
      const isEdit = addUserForm.dataset.mode === 'edit' && addUserIdField && addUserIdField.value;
      try {
        if (isEdit) {
          const { password, ...rest } = payload;
          // Only send password if user entered one
          if (password) {
            rest.password = password;
          }
          await apiFetch(`/api/users/${addUserIdField.value}`, {
            method: 'PATCH',
            body: JSON.stringify(rest)
          });
        } else {
          await apiFetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(payload)
          });
        }
        closeAddUser();
        fetchUsersPanel();
        setActivePanel('users');
        alert(isEdit ? 'User updated.' : 'User added.');
      } catch (err) {
        alert(err.message || 'Failed to save user');
      }
    });
  }


  function setActivePanel(key) {
    Object.keys(panels).forEach((k) => {
      if (panels[k]) panels[k].classList.toggle('active', k === key);
    });
    navItems.forEach((item) => {
      const target = item.dataset.link || 'dashboard';
      item.classList.toggle('active', target === key || (!item.dataset.link && key === 'dashboard'));
    });
  }

  navItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = item.dataset.link || 'dashboard';
      setActivePanel(target);
      if (target === 'assets') fetchAssetsPanel();
      if (target === 'borrowing') fetchDashboard(); // reuse requests slice
      if (target === 'users') fetchUsersPanel();
      if (target === 'dashboard') fetchDashboard();
      if (target === 'reports') {
        fetchAssetsPanel();
        fetchMaintenancePanel();
        renderReports();
      }
      closeSidebar();
    });
  });

  // Reset requests handling
  const renderResets = () => {
    if (!resetBody) return;
    resetBody.innerHTML = '';
    if (!resetCache.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 5;
      cell.textContent = 'No pending reset requests.';
      row.appendChild(cell);
      resetBody.appendChild(row);
    } else {
      resetCache.forEach((r) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${r.id}</td>
          <td>${r.email}</td>
          <td>${r.role || '-'}</td>
          <td>${r.created_at ? new Date(r.created_at).toISOString().slice(0,10) : '-'}</td>
          <td><button class="pill-btn slim primary" data-reset-id="${r.id}" data-reset-email="${r.email}">Set Password</button></td>
        `;
        resetBody.appendChild(row);
      });
    }
    if (notifyBadge) {
      if (resetCache.length) {
        notifyBadge.textContent = resetCache.length;
        notifyBadge.hidden = false;
      } else {
        notifyBadge.hidden = true;
      }
    }
  };

  async function fetchResets() {
    try {
      const data = await apiFetch('/api/auth/forgot');
      resetCache = (data && data.data && data.data.requests) || [];
      renderResets();
    } catch (err) {
      if (resetBody) resetBody.innerHTML = `<tr><td colspan="5">Failed to load reset requests</td></tr>`;
    }
  }

  if (notifyBtn) {
    notifyBtn.addEventListener('click', async () => {
      await fetchResets();
      if (resetModal) resetModal.classList.add('open');
      document.body.classList.add('modal-open');
    });
  }
  if (resetClose) resetClose.addEventListener('click', () => {
    if (resetModal) resetModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  });
  if (resetModal) {
    resetModal.addEventListener('click', (e) => {
      if (e.target === resetModal) {
        resetModal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    });
  }
  if (resetBody) {
    resetBody.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-reset-id]');
      if (!btn) return;
      const id = btn.dataset.resetId;
      const email = btn.dataset.resetEmail || '';
      if (resetSetId) resetSetId.value = id || '';
      if (resetSetEmail) resetSetEmail.textContent = email;
      if (resetSetPassword) resetSetPassword.value = '';
      if (resetSetMsg) resetSetMsg.textContent = '';
      if (resetSetModal) resetSetModal.classList.add('open');
      document.body.classList.add('modal-open');
    });
  }
  if (resetSetClose) resetSetClose.addEventListener('click', () => {
    if (resetSetModal) resetSetModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  });
  if (resetSetCancel) resetSetCancel.addEventListener('click', () => {
    if (resetSetModal) resetSetModal.classList.remove('open');
    document.body.classList.remove('modal-open');
  });
  if (resetSetModal) {
    resetSetModal.addEventListener('click', (e) => {
      if (e.target === resetSetModal) {
        resetSetModal.classList.remove('open');
        document.body.classList.remove('modal-open');
      }
    });
  }
  if (resetSetForm) {
    resetSetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = resetSetId ? resetSetId.value : '';
      const password = resetSetPassword ? resetSetPassword.value : '';
      if (!id || !password) return;
      if (resetSetMsg) { resetSetMsg.textContent = 'Saving...'; resetSetMsg.style.color = ''; }
      try {
        await apiFetch(`/api/auth/forgot/${id}`, { method: 'PATCH', body: JSON.stringify({ password }) });
        if (resetSetMsg) { resetSetMsg.textContent = 'Updated'; resetSetMsg.style.color = 'green'; }
        await fetchResets();
        setTimeout(() => {
          if (resetSetModal) resetSetModal.classList.remove('open');
          document.body.classList.remove('modal-open');
          // after closing, update badge on next tick
          if (resetCache && notifyBadge) {
            if (resetCache.length) {
              notifyBadge.textContent = resetCache.length;
              notifyBadge.hidden = false;
            } else {
              notifyBadge.hidden = true;
            }
          }
        }, 150);
      } catch (err) {
        if (resetSetMsg) { resetSetMsg.textContent = err.message || 'Failed'; resetSetMsg.style.color = '#b91c1c'; }
      }
    });
  }

  if (channel) {
    channel.addEventListener('message', (evt) => {
      if (!evt || !evt.data || !evt.data.type) return;
      if (evt.data.type === 'requests-updated') fetchDashboard();
      if (evt.data.type === 'reset-requested') fetchResets();
    });
  }

  setActivePanel('dashboard');

  fetchDashboard();
  fetchMaintenancePanel();
  fetchAssetsPanel();
  fetchUsersPanel();
  fetchResets();
});











