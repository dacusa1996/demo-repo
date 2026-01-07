document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const qpTab = params.get('tabId');
  const tabId = qpTab || window.name || crypto.randomUUID();
  window.name = tabId;
  const userRaw = localStorage.getItem(`admas_user_${tabId}`) || localStorage.getItem('admas_user');
  const token = localStorage.getItem(`admas_token_${tabId}`) || localStorage.getItem('admas_token');
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
  if (!userRaw || !token) {
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch (err) {
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  const isAdmin = (user.role || '').toLowerCase() === 'admin';
  if (!isAdmin) {
    alert('Admins only. Redirecting to dashboard.');
    window.location.href = `${baseRoot}/dashboard/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  // Build API base from current host so it works across IP changes
const apiBase = 'https://demo-repo-1-9qa0.onrender.com';
  const userNameEl = document.getElementById('user-name');
  const userRoleEl = document.getElementById('user-role');
  const usersBody = document.getElementById('users-body');
  const addUserBtn = document.getElementById('add-user-btn');
  const refreshBtn = document.getElementById('refresh-users');
  const logoutBtn = document.getElementById('logout-btn');
  const backBtn = document.getElementById('back-dashboard');
  const formSection = document.getElementById('user-form-section');
  const form = document.getElementById('user-form');
  const formTitle = document.getElementById('form-title');
  const cancelFormBtn = document.getElementById('cancel-form');

  const nameInput = document.getElementById('form-name');
  const emailInput = document.getElementById('form-email');
  const roleInput = document.getElementById('form-role');
  const deptInput = document.getElementById('form-dept');
  const passwordInput = document.getElementById('form-password');
  const statusInput = document.getElementById('form-status');

  userNameEl.textContent = user.name || 'Admin';
  userRoleEl.textContent = `Role: ${user.role || 'Admin'}`;

  let editingId = null;
  let users = [];

  function badge(status) {
    const cls = status.toLowerCase() === 'active' ? 'success' : 'danger';
    return `<span class="badge ${cls}">${status}</span>`;
  }

  function renderUsers(list) {
    usersBody.innerHTML = '';
    if (!list.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 7;
      cell.textContent = 'No users found.';
      row.appendChild(cell);
      usersBody.appendChild(row);
      return;
    }
    list.forEach((u) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${u.role}</td>
        <td>${u.department || '-'}</td>
        <td>${badge(u.status)}</td>
        <td class="actions">
          <button class="pill-btn slim" data-action="edit" data-id="${u.id}" type="button">Edit</button>
          <button class="pill-btn slim" data-action="toggle" data-id="${u.id}" type="button">${u.status === 'Active' ? 'Disable' : 'Enable'}</button>
        </td>
      `;
      usersBody.appendChild(row);
    });
  }

  function resetForm() {
    editingId = null;
    formTitle.textContent = 'Add User';
    form.reset();
    statusInput.value = 'Active';
    passwordInput.value = '';
  }

  function showForm() {
    formSection.classList.remove('hidden');
  }

  function hideForm() {
    formSection.classList.add('hidden');
    resetForm();
  }

  function handleEdit(id) {
    const existing = users.find((u) => u.id === id);
    if (!existing) return;
    editingId = id;
    formTitle.textContent = 'Edit User';
    nameInput.value = existing.name;
    emailInput.value = existing.email;
    roleInput.value = existing.role;
    deptInput.value = existing.department || '';
    statusInput.value = existing.status;
    passwordInput.value = '';
    showForm();
  }

  function handleToggle(id) {
    const targetUser = users.find((u) => u.id === id);
    if (!targetUser) return;
    const nextStatus = targetUser.status === 'Active' ? 'Disabled' : 'Active';
    saveUser({ id, status: nextStatus });
  }

  usersBody.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const id = Number(target.dataset.id);
    const action = target.dataset.action;
    if (!id || !action) return;
    if (action === 'edit') {
      handleEdit(id);
    } else if (action === 'toggle') {
      handleToggle(id);
    }
  });

  addUserBtn.addEventListener('click', () => {
    resetForm();
    showForm();
  });

  refreshBtn.addEventListener('click', fetchUsers);

  cancelFormBtn.addEventListener('click', hideForm);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const payload = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      role: roleInput.value,
      department: deptInput.value.trim(),
      status: statusInput.value,
      password: passwordInput.value
    };

    if (!payload.name || !payload.email || !payload.role) {
      alert('Name, email, and role are required.');
      return;
    }

    if (!editingId && !payload.password) {
      alert('Password is required for new users.');
      return;
    }

    saveUser({ ...payload, id: editingId || undefined });
  });

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(`admas_token_${tabId}`);
    localStorage.removeItem(`admas_user_${tabId}`);
    window.location.href = `${baseRoot}/login/index.html`;
  });

  backBtn.addEventListener('click', () => {
    window.location.href = `${baseRoot}/dashboard/index.html?tabId=${encodeURIComponent(tabId)}`;
  });

  async function fetchUsers() {
    try {
      const res = await fetch(`${apiBase}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.data) throw new Error(data && data.error ? data.error : 'Failed to load users');
      const mapped = (data.data.users || []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role || 'Clerk',
        department: u.department || '-',
        status: u.is_active === 0 ? 'Disabled' : u.is_active === false ? 'Disabled' : 'Active'
      }));
      users = mapped;
      renderUsers(users);
    } catch (err) {
      alert(err.message || 'Error loading users');
    }
  }

  async function saveUser(payload) {
    const isEdit = Boolean(payload.id);
    const url = isEdit ? `${apiBase}/api/users/${payload.id}` : `${apiBase}/api/users`;
    const method = isEdit ? 'PATCH' : 'POST';
    const body = {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      department: payload.department,
      status: payload.status
    };
    if (!isEdit || payload.password) body.password = payload.password;
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
      await fetchUsers();
      hideForm();
    } catch (err) {
      alert(err.message || 'Failed to save user');
    }
  }

  fetchUsers();
});
