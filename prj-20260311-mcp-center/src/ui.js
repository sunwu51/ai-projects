export const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Center - Server Management</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 30px; }
    h1 { color: #333; margin-bottom: 30px; font-size: 28px; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #218838; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    .btn-info { background: #17a2b8; color: white; }
    .btn-info:hover { background: #117a8b; }
    .btn:disabled { opacity: 0.65; cursor: not-allowed; }
    .spinner { display: inline-block; width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 0.6s linear infinite; margin-right: 4px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .toggle-wrap { display: flex; align-items: center; gap: 6px; }
    .toggle { position: relative; display: inline-block; width: 40px; height: 22px; flex-shrink: 0; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #ccc; border-radius: 22px; transition: 0.2s; }
    .toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: #28a745; }
    .toggle input:checked + .toggle-slider:before { transform: translateX(18px); }
    .toggle input:disabled + .toggle-slider { opacity: 0.5; cursor: not-allowed; }
    .server-item.disabled-server { opacity: 0.55; }
    .server-list { margin-top: 20px; }
    .server-item { border: 1px solid #ddd; border-radius: 6px; padding: 15px; margin-bottom: 12px; background: #fafafa; }
    .server-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .server-name { font-weight: bold; font-size: 17px; color: #333; }
    .server-type { display: inline-block; padding: 3px 7px; border-radius: 3px; font-size: 11px; margin-left: 8px; }
    .type-http { background: #d1ecf1; color: #0c5460; }
    .type-stdio { background: #d4edda; color: #155724; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px; }
    .status-connected { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .status-loading { background: #fff3cd; color: #856404; }
    .error-msg { font-size: 12px; color: #721c24; margin-top: 4px; background: #f8d7da; padding: 4px 8px; border-radius: 3px; }
    .server-details { font-size: 13px; color: #666; margin-top: 4px; }
    .caps-section { margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
    .caps-group { margin-bottom: 8px; }
    .caps-label { font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .caps-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .cap-tag { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-family: monospace; }
    .cap-tool { background: #e8f4fd; color: #1a6fa8; border: 1px solid #b8d9f0; }
    .cap-resource { background: #fef9e7; color: #8a6d00; border: 1px solid #f0dfa0; }
    .cap-template { background: #f3e8fd; color: #6a1a8a; border: 1px solid #d8b0f0; }
    .cap-prompt { background: #e8fdf0; color: #1a6a3a; border: 1px solid #a0e0b8; }
    .cap-desc { font-size: 11px; color: #888; margin-left: 4px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; color: #333; font-size: 14px; }
    input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    textarea { min-height: 80px; font-family: monospace; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal-content { background: white; margin: 40px auto; padding: 28px; border-radius: 8px; max-width: 640px; max-height: 85vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .close { font-size: 28px; cursor: pointer; color: #999; line-height: 1; }
    .close:hover { color: #333; }
    .type-fields { display: none; }
    .type-fields.active { display: block; }
    .btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
    .probe-section { margin-top: 10px; padding: 12px; background: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6; }
    .probe-section h4 { font-size: 13px; color: #555; margin-bottom: 8px; }
    .probe-loading { color: #856404; font-size: 13px; }
    .probe-error { color: #721c24; font-size: 13px; background: #f8d7da; padding: 6px 10px; border-radius: 3px; }
    .probe-group { margin-bottom: 10px; }
    .probe-group-label { font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; margin-bottom: 5px; }
    .probe-item { display: flex; align-items: flex-start; gap: 6px; padding: 3px 0; }
    .probe-item input[type=checkbox] { width: auto; margin-top: 2px; flex-shrink: 0; }
    .probe-item-name { font-family: monospace; font-size: 13px; color: #333; }
    .probe-item-desc { font-size: 12px; color: #888; }
    .enabled-tools-row { display: flex; align-items: center; gap: 8px; }
    .enabled-tools-row input { flex: 1; }
  </style>
</head>
<body>
  <div class="container">
    <h1>MCP Center</h1>
    <button class="btn btn-primary" onclick="openAddModal()">+ Add Server</button>
    <div class="server-list" id="serverList"></div>
  </div>

  <div id="modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="modalTitle">Add Server</h2>
        <span class="close" onclick="closeModal()">&times;</span>
      </div>
      <form id="serverForm" onsubmit="saveServer(event)">
        <div class="form-group">
          <label>Server Name *</label>
          <input type="text" id="serverName" required>
        </div>
        <div class="form-group">
          <label>Server Type *</label>
          <select id="serverType" onchange="toggleTypeFields()" required>
            <option value="http">HTTP</option>
            <option value="stdio">STDIO</option>
          </select>
        </div>
        <div id="httpFields" class="type-fields active">
          <div class="form-group">
            <label>URL *</label>
            <input type="url" id="serverUrl">
          </div>
          <div class="form-group">
            <label>HTTP Headers (JSON)</label>
            <textarea id="serverHeaders" placeholder='{"Authorization": "Bearer token"}'></textarea>
          </div>
        </div>
        <div id="stdioFields" class="type-fields">
          <div class="form-group">
            <label>Command *</label>
            <input type="text" id="serverCommand">
          </div>
          <div class="form-group">
            <label>Arguments (JSON array)</label>
            <textarea id="serverArgs" placeholder='["arg1", "arg2"]'></textarea>
          </div>
          <div class="form-group">
            <label>Environment Variables (JSON)</label>
            <textarea id="serverEnv" placeholder='{"KEY": "value"}'></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>Enabled Tools</label>
          <div class="enabled-tools-row">
            <input type="text" id="enabledTools" placeholder="Leave empty to enable all">
            <button type="button" class="btn btn-info" onclick="probeAndShowTools()">Query Tools</button>
          </div>
        </div>
        <div id="probeSection" style="display:none" class="probe-section">
          <div id="probeContent"></div>
        </div>
        <div class="btn-group" style="margin-top:16px">
          <button type="submit" class="btn btn-success">Save</button>
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let editingIndex = -1;

    async function loadServers() {
      const [serversRes, statusRes] = await Promise.all([
        fetch('/api/servers'),
        fetch('/api/servers/status'),
      ]);
      const servers = await serversRes.json();
      const statusMap = await statusRes.json();
      const list = document.getElementById('serverList');

      if (servers.length === 0) {
        list.innerHTML = '<p style="color:#999;margin-top:20px">No servers configured. Click "+ Add Server" to get started.</p>';
        return;
      }

      list.innerHTML = servers.map((s, i) => {
        const type = s.url ? 'http' : 'stdio';
        const maskObj = obj => JSON.stringify(Object.fromEntries(Object.keys(obj).map(k => [k, '******'])));
        const details = type === 'http'
          ? 'URL: ' + s.url + (s.httpHeaders && Object.keys(s.httpHeaders).length ? ' | Headers: ' + maskObj(s.httpHeaders) : '')
          : 'Command: ' + s.command + ' ' + (s.args || []).join(' ') + (s.env && Object.keys(s.env).length ? ' | Env: ' + maskObj(s.env) : '');
        const enabled = s.enabled !== false;
        const st = statusMap[s.name];
        let statusHtml = '';
        if (!enabled) {
          statusHtml = '<span class="status-badge" style="background:#e2e3e5;color:#6c757d">disabled</span>';
        } else if (st) {
          statusHtml = st.status === 'connected'
            ? '<span class="status-badge status-connected">connected</span>'
            : '<span class="status-badge status-failed">failed</span>';
        } else {
          statusHtml = '<span class="status-badge status-loading">loading...</span>';
        }
        const errorHtml = enabled && st && st.status === 'failed' && st.error
          ? '<div class="error-msg">Error: ' + escHtml(st.error) + '</div>'
          : '';
        const capsId = 'caps-' + i;
        return '<div class="server-item' + (enabled ? '' : ' disabled-server') + '" id="server-item-' + i + '">' +
          '<div class="server-header">' +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
              '<span class="server-name">' + escHtml(s.name) + '</span>' +
              '<span class="server-type type-' + type + '">' + type.toUpperCase() + '</span>' +
              statusHtml +
            '</div>' +
            '<div class="btn-group" style="align-items:center">' +
              '<div class="toggle-wrap" title="' + (enabled ? 'Click to disable' : 'Click to enable') + '">' +
                '<label class="toggle"><input type="checkbox" id="toggle-' + i + '" ' + (enabled ? 'checked' : '') + ' onchange="toggleServer(' + i + ', this)"><span class="toggle-slider"></span></label>' +
              '</div>' +
              '<button class="btn btn-primary" id="edit-btn-' + i + '" onclick="editServer(' + i + ')">Edit</button>' +
              '<button class="btn btn-danger" id="delete-btn-' + i + '" onclick="deleteServer(' + i + ')">Delete</button>' +
            '</div>' +
          '</div>' +
          '<div class="server-details">' + escHtml(details) + '</div>' +
          (s.enabledTools ? '<div class="server-details">Enabled Tools: ' + escHtml(s.enabledTools.join(', ')) + '</div>' : '') +
          errorHtml +
          (enabled && st && st.status === 'connected'
            ? '<div class="caps-section" id="' + capsId + '"><span style="font-size:12px;color:#999">Loading capabilities...</span></div>'
            : '') +
        '</div>';
      }).join('');

      // Load capabilities for connected servers
      servers.forEach((s, i) => {
        const st = statusMap[s.name];
        if (s.enabled !== false && st && st.status === 'connected') {
          loadCaps(s.name, 'caps-' + i);
        }
      });
    }

    function setButtonLoading(btn, loading, originalText) {
      if (loading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span>' + originalText;
      } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.originalText || originalText;
      }
    }

    async function toggleServer(index, checkbox) {
      checkbox.disabled = true;
      try {
        const res = await fetch('/api/servers/' + index + '/toggle', { method: 'PATCH' });
        if (!res.ok) {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
          checkbox.checked = !checkbox.checked; // revert
        }
        await loadServers();
      } catch(e) {
        alert('Error: ' + e.message);
        checkbox.checked = !checkbox.checked;
        checkbox.disabled = false;
      }
    }

    function escHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    async function loadCaps(serverName, elId) {
      const el = document.getElementById(elId);
      if (!el) return;
      try {
        const res = await fetch('/api/servers/' + encodeURIComponent(serverName) + '/capabilities');
        if (!res.ok) { el.innerHTML = ''; return; }
        const caps = await res.json();
        let html = '';
        if (caps.tools && caps.tools.length > 0) {
          html += '<div class="caps-group"><div class="caps-label">Tools (' + caps.tools.length + ')</div><div class="caps-list">' +
            caps.tools.map(t => '<span class="cap-tag cap-tool" title="' + escHtml(t.description) + '">' + escHtml(t.name) + '</span>').join('') +
          '</div></div>';
        }
        if (caps.resources && caps.resources.length > 0) {
          html += '<div class="caps-group"><div class="caps-label">Resources (' + caps.resources.length + ')</div><div class="caps-list">' +
            caps.resources.map(r => '<span class="cap-tag cap-resource" title="' + escHtml(r.description) + '">' + escHtml(r.uri) + '</span>').join('') +
          '</div></div>';
        }
        if (caps.resourceTemplates && caps.resourceTemplates.length > 0) {
          html += '<div class="caps-group"><div class="caps-label">Resource Templates (' + caps.resourceTemplates.length + ')</div><div class="caps-list">' +
            caps.resourceTemplates.map(r => '<span class="cap-tag cap-template" title="' + escHtml(r.description) + '">' + escHtml(r.uriTemplate) + '</span>').join('') +
          '</div></div>';
        }
        if (caps.prompts && caps.prompts.length > 0) {
          html += '<div class="caps-group"><div class="caps-label">Prompts (' + caps.prompts.length + ')</div><div class="caps-list">' +
            caps.prompts.map(p => '<span class="cap-tag cap-prompt" title="' + escHtml(p.description) + '">' + escHtml(p.name) + '</span>').join('') +
          '</div></div>';
        }
        el.innerHTML = html || '<span style="font-size:12px;color:#999">No capabilities found</span>';
      } catch(e) {
        el.innerHTML = '';
      }
    }

    function buildProbeConfig() {
      const type = document.getElementById('serverType').value;
      const cfg = { name: '__probe__' };
      if (type === 'http') {
        cfg.url = document.getElementById('serverUrl').value;
        const h = document.getElementById('serverHeaders').value.trim();
        if (h) { try { cfg.httpHeaders = JSON.parse(h); } catch(_) {} }
      } else {
        cfg.command = document.getElementById('serverCommand').value;
        const a = document.getElementById('serverArgs').value.trim();
        if (a) { try { cfg.args = JSON.parse(a); } catch(_) {} }
        const e = document.getElementById('serverEnv').value.trim();
        if (e) { try { cfg.env = JSON.parse(e); } catch(_) {} }
      }
      return cfg;
    }

    async function probeAndShowTools() {
      const sec = document.getElementById('probeSection');
      const content = document.getElementById('probeContent');
      sec.style.display = 'block';
      content.innerHTML = '<div class="probe-loading">Connecting to server...</div>';

      const cfg = buildProbeConfig();
      try {
        const res = await fetch('/api/probe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg)
        });
        const data = await res.json();
        if (!res.ok) {
          content.innerHTML = '<div class="probe-error">Error: ' + escHtml(data.error || 'Unknown error') + '</div>';
          return;
        }
        renderProbeResults(data);
      } catch(e) {
        content.innerHTML = '<div class="probe-error">Error: ' + escHtml(e.message) + '</div>';
      }
    }

    function renderProbeResults(data) {
      const content = document.getElementById('probeContent');
      let html = '<h4>Select capabilities to enable (all checked by default):</h4>';

      if (data.tools && data.tools.length > 0) {
        html += '<div class="probe-group"><div class="probe-group-label">Tools (' + data.tools.length + ')</div>';
        data.tools.forEach(t => {
          html += '<div class="probe-item">' +
            '<input type="checkbox" class="probe-tool-cb" value="' + escHtml(t.name) + '" checked>' +
            '<div><div class="probe-item-name">' + escHtml(t.name) + '</div>' +
            (t.description ? '<div class="probe-item-desc">' + escHtml(t.description) + '</div>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }

      if (data.resources && data.resources.length > 0) {
        html += '<div class="probe-group"><div class="probe-group-label">Resources (' + data.resources.length + ')</div>';
        data.resources.forEach(r => {
          html += '<div class="probe-item">' +
            '<input type="checkbox" class="probe-resource-cb" value="' + escHtml(r.uri) + '" checked>' +
            '<div><div class="probe-item-name">' + escHtml(r.uri) + '</div>' +
            (r.description ? '<div class="probe-item-desc">' + escHtml(r.description) + '</div>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }

      if (data.resourceTemplates && data.resourceTemplates.length > 0) {
        html += '<div class="probe-group"><div class="probe-group-label">Resource Templates (' + data.resourceTemplates.length + ')</div>';
        data.resourceTemplates.forEach(r => {
          html += '<div class="probe-item">' +
            '<input type="checkbox" class="probe-template-cb" value="' + escHtml(r.uriTemplate) + '" checked>' +
            '<div><div class="probe-item-name">' + escHtml(r.uriTemplate) + '</div>' +
            (r.description ? '<div class="probe-item-desc">' + escHtml(r.description) + '</div>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }

      if (data.prompts && data.prompts.length > 0) {
        html += '<div class="probe-group"><div class="probe-group-label">Prompts (' + data.prompts.length + ')</div>';
        data.prompts.forEach(p => {
          html += '<div class="probe-item">' +
            '<input type="checkbox" class="probe-prompt-cb" value="' + escHtml(p.name) + '" checked>' +
            '<div><div class="probe-item-name">' + escHtml(p.name) + '</div>' +
            (p.description ? '<div class="probe-item-desc">' + escHtml(p.description) + '</div>' : '') +
            '</div></div>';
        });
        html += '</div>';
      }

      if (!data.tools?.length && !data.resources?.length && !data.resourceTemplates?.length && !data.prompts?.length) {
        html += '<div style="color:#999;font-size:13px">No capabilities found on this server.</div>';
      }

      content.innerHTML = html;

      // Sync tool checkboxes -> enabledTools input
      content.querySelectorAll('.probe-tool-cb').forEach(cb => {
        cb.addEventListener('change', syncEnabledTools);
      });
      syncEnabledTools();
    }

    function syncEnabledTools() {
      const cbs = document.querySelectorAll('.probe-tool-cb');
      if (!cbs.length) return;
      const all = Array.from(cbs);
      const checked = all.filter(c => c.checked).map(c => c.value);
      // If all checked, leave empty (means "all enabled")
      document.getElementById('enabledTools').value = checked.length === all.length ? '' : checked.join(', ');
    }

    function openAddModal() {
      editingIndex = -1;
      document.getElementById('modalTitle').textContent = 'Add Server';
      document.getElementById('serverForm').reset();
      document.getElementById('probeSection').style.display = 'none';
      document.getElementById('probeContent').innerHTML = '';
      document.getElementById('modal').style.display = 'block';
      toggleTypeFields();
    }

    async function editServer(index) {
      const res = await fetch('/api/servers');
      const servers = await res.json();
      const server = servers[index];
      editingIndex = index;

      document.getElementById('modalTitle').textContent = 'Edit Server';
      document.getElementById('serverName').value = server.name;
      document.getElementById('serverType').value = server.url ? 'http' : 'stdio';

      if (server.url) {
        document.getElementById('serverUrl').value = server.url;
        document.getElementById('serverHeaders').value = server.httpHeaders ? JSON.stringify(server.httpHeaders, null, 2) : '';
      } else {
        document.getElementById('serverCommand').value = server.command || '';
        document.getElementById('serverArgs').value = server.args ? JSON.stringify(server.args) : '';
        document.getElementById('serverEnv').value = server.env ? JSON.stringify(server.env, null, 2) : '';
      }

      document.getElementById('enabledTools').value = server.enabledTools ? server.enabledTools.join(', ') : '';
      document.getElementById('probeSection').style.display = 'none';
      document.getElementById('probeContent').innerHTML = '';
      document.getElementById('modal').style.display = 'block';
      toggleTypeFields();
    }

    async function deleteServer(index) {
      if (!confirm('Are you sure you want to delete this server?')) return;
      const btn = document.getElementById('delete-btn-' + index);
      setButtonLoading(btn, true, 'Deleting...');
      try {
        const res = await fetch('/api/servers/' + index, { method: 'DELETE' });
        if (!res.ok) {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
          setButtonLoading(btn, false, 'Delete');
          return;
        }
        await loadServers();
      } catch(e) {
        alert('Error: ' + e.message);
        setButtonLoading(btn, false, 'Delete');
      }
    }

    async function saveServer(e) {
      e.preventDefault();
      const name = document.getElementById('serverName').value;
      const type = document.getElementById('serverType').value;
      const enabledTools = document.getElementById('enabledTools').value
        .split(',').map(t => t.trim()).filter(t => t);

      const server = { name };
      if (enabledTools.length > 0) server.enabledTools = enabledTools;

      // Collect enabled resources/templates/prompts from probe checkboxes if visible
      const resourceCbs = document.querySelectorAll('.probe-resource-cb');
      if (resourceCbs.length) {
        const all = Array.from(resourceCbs);
        const checked = all.filter(c => c.checked).map(c => c.value);
        if (checked.length < all.length) server.enabledResources = checked;
      }
      const templateCbs = document.querySelectorAll('.probe-template-cb');
      if (templateCbs.length) {
        const all = Array.from(templateCbs);
        const checked = all.filter(c => c.checked).map(c => c.value);
        if (checked.length < all.length) server.enabledResourceTemplates = checked;
      }
      const promptCbs = document.querySelectorAll('.probe-prompt-cb');
      if (promptCbs.length) {
        const all = Array.from(promptCbs);
        const checked = all.filter(c => c.checked).map(c => c.value);
        if (checked.length < all.length) server.enabledPrompts = checked;
      }

      if (type === 'http') {
        server.url = document.getElementById('serverUrl').value;
        const headers = document.getElementById('serverHeaders').value.trim();
        if (headers) {
          try { server.httpHeaders = JSON.parse(headers); }
          catch(_) { alert('Invalid JSON for HTTP headers'); return; }
        }
      } else {
        server.command = document.getElementById('serverCommand').value;
        const args = document.getElementById('serverArgs').value.trim();
        if (args) {
          try { server.args = JSON.parse(args); }
          catch(_) { alert('Invalid JSON for arguments'); return; }
        }
        const env = document.getElementById('serverEnv').value.trim();
        if (env) {
          try { server.env = JSON.parse(env); }
          catch(_) { alert('Invalid JSON for environment variables'); return; }
        }
      }

      const method = editingIndex >= 0 ? 'PUT' : 'POST';
      const url = editingIndex >= 0 ? '/api/servers/' + editingIndex : '/api/servers';

      const saveBtn = document.querySelector('#serverForm .btn-success');
      setButtonLoading(saveBtn, true, 'Saving...');
      saveBtn.disabled = true;

      try {
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(server)
        });
        if (!res.ok) {
          const data = await res.json();
          alert('Error: ' + (data.error || 'Unknown error'));
          setButtonLoading(saveBtn, false, 'Save');
          return;
        }
        setButtonLoading(saveBtn, false, 'Save');
        closeModal();
        await loadServers();
      } catch(e) {
        alert('Error: ' + e.message);
        setButtonLoading(saveBtn, false, 'Save');
      }
    }

    function closeModal() {
      document.getElementById('modal').style.display = 'none';
    }

    function toggleTypeFields() {
      const type = document.getElementById('serverType').value;
      document.getElementById('httpFields').classList.toggle('active', type === 'http');
      document.getElementById('stdioFields').classList.toggle('active', type === 'stdio');
    }

    loadServers();
  </script>
</body>
</html>`;
