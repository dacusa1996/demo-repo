document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const qpTab = params.get('tabId');
  const tabId = qpTab || window.name || crypto.randomUUID();
  window.name = tabId;

  const getScoped = (key) => localStorage.getItem(`${key}_${tabId}`) || localStorage.getItem(key);
  const removeScoped = (key) => {
    localStorage.removeItem(`${key}_${tabId}`);
    localStorage.removeItem(key);
  };

  const isFile = window.location.protocol === 'file:';
  const baseRoot = isFile ? 'file:///C:/codin/final%203/final-project-admas/frontend' : `${window.location.origin}/frontend`;

  const userRaw = getScoped('admas_user');
  const token = getScoped('admas_token');
  if (!userRaw || !token) {
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch (_) {
    window.location.href = `${baseRoot}/login/index.html?tabId=${encodeURIComponent(tabId)}`;
    return;
  }

  const nameEl = document.getElementById('p-name');
  const emailEl = document.getElementById('p-email');
  const roleEl = document.getElementById('p-role');
  const deptEl = document.getElementById('p-dept');
  const headerNameEl = document.getElementById('user-name');
  const headerRoleEl = document.getElementById('user-role');
  const logoutBtn = document.getElementById('logout-btn');
  const backBtn = document.getElementById('back-btn');

  nameEl.textContent = user.name || '-';
  emailEl.textContent = user.email || '-';
  roleEl.textContent = user.role || '-';
  deptEl.textContent = user.department || '-';
  headerNameEl.textContent = user.name || 'User';
  headerRoleEl.textContent = `Role: ${user.role || '-'}`;

  logoutBtn.addEventListener('click', () => {
    removeScoped('admas_token');
    removeScoped('admas_user');
    window.location.href = `${baseRoot}/login/index.html`;
  });

  backBtn.addEventListener('click', () => {
    const role = (user.role || '').toLowerCase().replace(/[\s_-]+/g, '');
    const tabQuery = `?tabId=${encodeURIComponent(tabId)}`;
    let target = `${baseRoot}/dashboard/index.html${tabQuery}`;
    if (role === 'clerk') target = `${baseRoot}/clerk/index.html${tabQuery}`;
    else if (role === 'departmenthead') target = `${baseRoot}/dept-head/index.html${tabQuery}`;
    window.location.href = target;
  });
});
