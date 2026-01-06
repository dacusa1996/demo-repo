document.addEventListener('DOMContentLoaded', () => {
  const tabId = window.name || crypto.randomUUID();
  window.name = tabId;
  const userRaw = localStorage.getItem(`admas_user_${tabId}`);
  const token = localStorage.getItem(`admas_token_${tabId}`);
  if (!userRaw || !token) {
    window.location.href = '/login/';
    return;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch (err) {
    window.location.href = '/login/';
    return;
  }

  const isAdmin = (user.role || '').toLowerCase() === 'admin';
  if (!isAdmin) {
    alert('Admins only. Redirecting to dashboard.');
    window.location.href = '/dashboard/';
    return;
  }

  const isFile = window.location.protocol === 'file:';
  const baseRoot = isFile ? 'file:///C:/codin/final%203/final-project-admas/frontend' : `${window.location.origin}/frontend`;
  const apiBase = 'https://demo-repo-1-9qa0.onrender.com';

  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const assetsBody = document.getElementById('assets-body');
  const addAssetBtn = document.getElementById('add-asset-btn');
  const refreshBtn = document.getElementById('refresh-assets');
  const logoutBtn = document.getElementById('logout-btn');
  const backBtn = document.getElementById('back-dashboard');
  const searchInput = document.getElementById('search-input');
  const filterDept = document.getElementById('filter-dept');
  const filterCategory = document.getElementById('filter-category');
  const filterStatus = document.getElementById('filter-status');
  const filterCondition = document.getElementById('filter-condition');

  const formSection = document.getElementById('asset-form-section');
  const form = document.getElementById('asset-form');
  const formTitle = document.getElementById('form-title');
  const cancelFormBtn = document.getElementById('cancel-form');
  const nameInput = document.getElementById('form-name');
  const tagInput = document.getElementById('form-tag');
  const categoryInput = document.getElementById('form-category');
  const deptInput = document.getElementById('form-dept');
  const conditionInput = document.getElementById('form-condition');
  const statusInput = document.getElementById('form-status');
  const locationInput = document.getElementById('form-location');
  const descInput = document.getElementById('form-description');

  userNameEl.textContent = user.name || 'Admin';
  userRoleEl.textContent = `Role: ${user.role || 'Admin'}`;

  let editingId = null;
  let assets = [];

  function badge(status, type) {
    const cls = type || 'success';
    return `<span class="badge ${cls}">${status}</span>`;
  }

  function statusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'borrowed') return badge('Borrowed', 'warn');
    if (s === 'maintenance' || s === 'under_maintenance') return badge('Under Maintenance', 'danger');
    return badge('Available', 'success');
  }

  function conditionBadge(cond) {
    const c = (cond || '').toLowerCase();
    if (c === 'poor') return badge('Poor', 'danger');
    if (c === 'fair') return badge('Fair', 'warn');
    return badge('Good', 'success');
  }

  function renderAssets(list) {
    assetsBody.innerHTML = '';
    if (!list.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 10;
      cell.textContent = 'No assets found.';
      row.appendChild(cell);
      assetsBody.appendChild(row);
      return;
    }
    list.forEach((a) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${a.asset_tag}</td>
        <td>${a.tag_year || '-'}</td>
        <td>${a.tag_month || '-'}</td>
        <td>${a.tag_day || '-'}</td>
        <td>${a.name}</td>
        <td>${a.category || '-'}</td>
        <td>${a.department || '-'}</td>
        <td>${conditionBadge(a.condition || a.cond)}</td>
        <td>${statusBadge(a.status)}</td>
        <td class="actions">
          <button class="pill-btn slim" data-action="view" data-id="${a.id}" type="button">View</button>
          <button class="pill-btn slim" data-action="edit" data-id="${a.id}" type="button">Edit</button>
          <button class="pill-btn slim" data-action="delete" data-id="${a.id}" type="button">Delete</button>
        </td>
      `;
      assetsBody.appendChild(row);
    });
  }

  function resetForm() {
    editingId = null;
    formTitle.textContent = 'Add Asset';
    form.reset();
    conditionInput.value = 'good';
    statusInput.value = 'available';
  }

  function showForm() { formSection.classList.remove('hidden'); }
  function hideForm() { formSection.classList.add('hidden'); resetForm(); }

  function applyFilters() {
    const term = searchInput.value.trim().toLowerCase();
    const dept = filterDept.value;
    const cat = filterCategory.value;
    const status = filterStatus.value;
    const cond = filterCondition.value;
    const filtered = assets.filter((a) => {
      const matchesTerm = !term || (a.name || '').toLowerCase().includes(term) || (a.asset_tag || '').toLowerCase().includes(term);
      const matchesDept = !dept || (a.department || '').toLowerCase() === dept.toLowerCase();
      const matchesCat = !cat || (a.category || '').toLowerCase() === cat.toLowerCase();
      const matchesStatus = !status || (a.status || '').toLowerCase() === status.toLowerCase();
      const matchesCond = !cond || (a.cond || a.condition || '').toLowerCase() === cond.toLowerCase();
      return matchesTerm && matchesDept && matchesCat && matchesStatus && matchesCond;
    });
    renderAssets(filtered);
  }

  function populateFilterOptions() {
    const depts = Array.from(new Set(assets.map((a) => a.department).filter(Boolean)));
    const cats = Array.from(new Set(assets.map((a) => a.category).filter(Boolean)));
    filterDept.innerHTML = '<option value=\"\">All</option>' + depts.map((d) => `<option value=\"${d}\">${d}</option>`).join('');
    filterCategory.innerHTML = '<option value=\"\">All</option>' + cats.map((c) => `<option value=\"${c}\">${c}</option>`).join('');
  }

  function handleEdit(id) {
    const a = assets.find((x) => x.id === id);
    if (!a) return;
    editingId = id;
    formTitle.textContent = 'Edit Asset';
    nameInput.value = a.name || '';
    tagInput.value = a.asset_tag || '';
    categoryInput.value = a.category || '';
    deptInput.value = a.department || '';
    conditionInput.value = (a.cond || a.condition || 'good').toLowerCase();
    statusInput.value = (a.status || 'available').toLowerCase();
    locationInput.value = a.location || '';
    descInput.value = a.description || '';
    showForm();
  }

  function handleView(id) {
    const a = assets.find((x) => x.id === id);
    if (!a) return;
    alert(`Asset: ${a.name}\nTag: ${a.asset_tag}\nCategory: ${a.category || '-'}\nDepartment: ${a.department || '-'}\nStatus: ${a.status}\nCondition: ${a.cond || a.condition || '-'}`);
  }

  function handleDelete(id) {
    const a = assets.find((x) => x.id === id);
    if (!a) return;
    const ok = confirm(`Delete asset ${a.name} (${a.asset_tag})?`);
    if (!ok) return;
    deleteAsset(id);
  }

  assetsBody.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const id = Number(target.dataset.id);
    const action = target.dataset.action;
    if (!id || !action) return;
    if (action === 'edit') handleEdit(id);
    else if (action === 'view') handleView(id);
    else if (action === 'delete') handleDelete(id);
  });

  addAssetBtn.addEventListener('click', () => {
    resetForm();
    showForm();
  });

  refreshBtn.addEventListener('click', fetchAssets);
  cancelFormBtn.addEventListener('click', hideForm);

  [searchInput, filterDept, filterCategory, filterStatus, filterCondition].forEach((el) => {
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      name: nameInput.value.trim(),
      asset_tag: tagInput.value.trim(),
      category: categoryInput.value.trim(),
      department: deptInput.value.trim(),
      condition: conditionInput.value,
      status: statusInput.value,
      location: locationInput.value.trim(),
      description: descInput.value.trim()
    };
    if (!payload.name) {
      alert('Asset name is required.');
      return;
    }
    // asset_tag optional: backend will derive prefix from dept/category if blank
    saveAsset({ ...payload, id: editingId || undefined });
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(`admas_token_${tabId}`);
    localStorage.removeItem(`admas_user_${tabId}`);
    window.location.href = `${baseRoot}/login/index.html`;
  });

  backBtn.addEventListener('click', () => {
    window.location.href = `${baseRoot}/dashboard/index.html`;
  });

  async function fetchAssets() {
    try {
      const res = await fetch(`${apiBase}/api/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data && data.error ? data.error : 'Failed to load assets');
      const payload = (data.data && data.data.assets) || data.assets || [];
      const mapped = payload.map((a) => ({
        ...a,
        condition: a.cond || a.condition,
        tag_year: a.tag_year || a.year,
        tag_month: a.tag_month || a.month,
        tag_day: a.tag_day || a.day
      }));
      assets = mapped;
      populateFilterOptions();
      applyFilters();
    } catch (err) {
      alert(err.message || 'Error loading assets');
    }
  }

  async function saveAsset(payload) {
    const isEdit = Boolean(payload.id);
    const url = isEdit ? `${apiBase}/api/assets/${payload.id}` : `${apiBase}/api/assets`;
    const method = isEdit ? 'PATCH' : 'POST';
    const body = {
      name: payload.name,
      asset_tag: payload.asset_tag,
      category: payload.category,
      department: payload.department,
      condition: payload.condition,
      status: payload.status,
      location: payload.location,
      description: payload.description
    };
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data && data.error ? data.error : 'Request failed');
      await fetchAssets();
      hideForm();
      if (data.data && data.data.asset_tag) {
        alert(`Asset saved. Generated tag: ${data.data.asset_tag}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to save asset');
    }
  }

  async function deleteAsset(id) {
    try {
      const res = await fetch(`${apiBase}/api/assets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data && data.error ? data.error : 'Delete failed');
      await fetchAssets();
    } catch (err) {
      alert(err.message || 'Failed to delete asset');
    }
  }

  fetchAssets();
});
