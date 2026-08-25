(function () {
  "use strict";

  var TOKEN_KEY = "spda_token";

  var state = {
    role: "viewer",
    userId: null,
    userEmail: null,
    areas: [],
    nc: [],
    docCountRows: [],
    documentos: [],
    contratoInfo: null,
    D: null,
    pollTimer: null
  };

  // -----------------------------------------------------------------
  // Camada de rede: única parte do app que fala com a API. Injeta o
  // Bearer token em toda chamada e centraliza o tratamento de 401
  // (sessão expirada/token inválido -> volta pro login).
  // -----------------------------------------------------------------
  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
  function clearToken() { localStorage.removeItem(TOKEN_KEY); }

  function apiRequest(method, path, body) {
    var headers = {};
    var token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
    var opts = { method: method, headers: headers };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    return fetch(API_CONFIG.baseUrl + path, opts).then(function (res) {
      if (res.status === 401) {
        handleUnauthorized();
        return Promise.reject(new Error("Sessão expirada."));
      }
      if (res.status === 204) return null;
      return res.json().catch(function () { return null; }).then(function (data) {
        if (!res.ok) {
          throw new Error((data && data.error) || ("Erro " + res.status));
        }
        return data;
      });
    });
  }

  var api = {
    get: function (path) { return apiRequest("GET", path); },
    post: function (path, body) { return apiRequest("POST", path, body || {}); },
    patch: function (path, body) { return apiRequest("PATCH", path, body || {}); },
    del: function (path) { return apiRequest("DELETE", path); }
  };

  function handleUnauthorized() {
    clearToken();
    stopPolling();
    showLogin();
  }

  // -----------------------------------------------------------------
  // Ícones estáticos / toast / tooltip / navegação
  // -----------------------------------------------------------------
  var ICON_MAP = {
    "icon-grid": "grid", "icon-alert-triangle": "alert_triangle", "icon-clipboard-list": "clipboard_list",
    "icon-alert-octagon": "alert_octagon", "icon-file-text": "file_text", "icon-pencil": "edit_pencil",
    "icon-users": "users", "icon-alert-1": "alert_triangle", "icon-plus-1": "plus", "icon-plus-2": "plus",
    "icon-plus-3": "plus", "icon-plus-4": "plus", "icon-plus-5": "plus", "icon-plus-6": "plus", "icon-plus-7": "plus"
  };

  function fillStaticIcons() {
    Object.keys(ICON_MAP).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = ICONS[ICON_MAP[id]];
    });
    document.getElementById("themeIcon").innerHTML = ICONS.moon;
  }

  var toastTimer = null;
  function showToast(message, isError) {
    var toast = document.getElementById("toast");
    document.getElementById("toast-icon").innerHTML = isError ? ICONS.alert_circle : ICONS.check_circle;
    document.getElementById("toast-text").textContent = message;
    toast.classList.toggle("err", !!isError);
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, isError ? 6000 : 3200);
  }

  function activatePanel(name) {
    document.querySelectorAll(".nav-item[data-panel]").forEach(function (b) { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
    document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
    var navBtn = document.querySelector('.nav-item[data-panel="' + name + '"]');
    if (navBtn) { navBtn.classList.add("active"); navBtn.setAttribute("aria-selected", "true"); }
    var panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
  }

  var tooltip, ttValue, ttLabel;
  function showTip(e, g) {
    ttValue.textContent = g.getAttribute("data-value");
    ttLabel.textContent = g.getAttribute("data-label");
    tooltip.classList.add("show");
    moveTip(e);
  }
  function moveTip(e) {
    tooltip.style.left = (e.clientX || 0) + "px";
    tooltip.style.top = (e.clientY || 0) + "px";
  }
  function hideTip() { tooltip.classList.remove("show"); }

  function setupChromeInteractions() {
    tooltip = document.getElementById("tooltip");
    ttValue = document.getElementById("tt-value");
    ttLabel = document.getElementById("tt-label");

    document.addEventListener("click", function (e) {
      var panelBtn = e.target.closest("[data-panel]");
      if (panelBtn) { activatePanel(panelBtn.getAttribute("data-panel")); return; }
      var toggleBtn = e.target.closest(".toggle-btn[data-target]");
      if (toggleBtn) {
        var wrap = document.getElementById(toggleBtn.getAttribute("data-target"));
        var chartView = wrap.querySelector(".chart-view"), tableView = wrap.querySelector(".table-view");
        var showingTable = !tableView.hidden;
        tableView.hidden = showingTable; chartView.hidden = !showingTable;
        toggleBtn.textContent = showingTable ? "Ver tabela" : "Ver gráfico";
      }
    });
    document.getElementById("themeToggle").addEventListener("click", function () {
      var root = document.documentElement;
      var isDark = root.getAttribute("data-theme") === "dark";
      root.setAttribute("data-theme", isDark ? "light" : "dark");
      document.getElementById("themeIcon").innerHTML = isDark ? ICONS.moon : ICONS.sun;
      document.getElementById("themeLabel").textContent = isDark ? "Modo escuro" : "Modo claro";
    });
    document.addEventListener("pointermove", function (e) { var g = e.target.closest(".bar-g"); if (g) showTip(e, g); });
    document.addEventListener("pointerover", function (e) { var g = e.target.closest(".bar-g"); if (g && (!e.relatedTarget || !g.contains(e.relatedTarget))) showTip(e, g); });
    document.addEventListener("pointerout", function (e) { var g = e.target.closest(".bar-g"); if (g && (!e.relatedTarget || !g.contains(e.relatedTarget))) hideTip(); });
  }

  // -----------------------------------------------------------------
  // Carregamento de dados + agregação + render + polling
  // -----------------------------------------------------------------
  function fetchAll() {
    return Promise.all([
      api.get("/api/areas"),
      api.get("/api/nao-conformidades"),
      api.get("/api/documentacao-tipos"),
      api.get("/api/documentos"),
      api.get("/api/contrato-info")
    ]).then(function (results) {
      state.areas = results[0] || [];
      state.nc = results[1] || [];
      state.docCountRows = results[2] || [];
      state.documentos = results[3] || [];
      state.contratoInfo = results[4] || null;
      state.D = computeAggregates(state.areas, state.nc, state.docCountRows, state.documentos, state.contratoInfo);
      return state.D;
    });
  }

  function refreshAndRender() {
    return fetchAll().then(function (D) {
      renderDashboard(D, state.role);
    }).catch(function (err) {
      if (err && err.message === "Sessão expirada.") return;
      showToast("Não foi possível atualizar os dados: " + err.message, true);
    });
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(refreshAndRender, 8000);
  }
  function stopPolling() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  }

  // -----------------------------------------------------------------
  // CRUD: Áreas
  // -----------------------------------------------------------------
  var AREA_NUMBER_FIELDS = { adequacao_geral: true };

  function parseAreaFieldValue(field, raw) {
    if (raw === "") return null;
    if (AREA_NUMBER_FIELDS[field]) { var n = parseFloat(raw); return isNaN(n) ? null : n; }
    return raw;
  }

  function saveAreaField(tr, field, raw) {
    var id = tr.getAttribute("data-id");
    var value = parseAreaFieldValue(field, raw);
    var patch = {}; patch[field] = value;
    api.patch("/api/areas/" + id, patch).then(function () {
      tr.classList.remove("row-save-flash"); void tr.offsetWidth; tr.classList.add("row-save-flash");
    }).catch(function (err) {
      showToast("Erro ao salvar: " + err.message, true);
    });
  }

  function addArea() {
    api.post("/api/areas", { descricao: "Nova área" }).then(function () {
      showToast("Área criada. Edite os campos na tabela.", false);
      refreshAndRender();
    }).catch(function (err) {
      showToast("Erro ao criar área: " + err.message, true);
    });
  }

  function removeArea(id) {
    if (!window.confirm("Remover esta área? Não conformidades vinculadas ficam sem área associada.")) return;
    api.del("/api/areas/" + id).then(function () {
      refreshAndRender();
    }).catch(function (err) {
      showToast("Erro ao remover: " + err.message, true);
    });
  }

  // -----------------------------------------------------------------
  // CRUD: Não Conformidades
  // -----------------------------------------------------------------
  function saveNcField(tr, field, raw) {
    var id = tr.getAttribute("data-id");
    var value = raw === "" ? null : raw;
    if (field === "area_id") value = raw === "" ? null : parseInt(raw, 10);
    var patch = {}; patch[field] = value;
    api.patch("/api/nao-conformidades/" + id, patch).then(function () {
      tr.classList.remove("row-save-flash"); void tr.offsetWidth; tr.classList.add("row-save-flash");
    }).catch(function (err) {
      showToast("Erro ao salvar: " + err.message, true);
    });
  }

  function addNc() {
    api.post("/api/nao-conformidades", { descricao: "Nova ocorrência", severidade: "Média", status: "Aberta" }).then(function () {
      showToast("Registro criado. Edite os campos na tabela.", false);
      refreshAndRender();
    }).catch(function (err) {
      showToast("Erro ao criar registro: " + err.message, true);
    });
  }

  function removeNc(id) {
    if (!window.confirm("Remover este registro de não conformidade?")) return;
    api.del("/api/nao-conformidades/" + id).then(function () {
      refreshAndRender();
    }).catch(function (err) {
      showToast("Erro ao remover: " + err.message, true);
    });
  }

  function setupEditorInteractions() {
    document.getElementById("editor-add-area").addEventListener("click", function () {
      if (state.role !== "editor" && state.role !== "admin") return;
      addArea();
    });
    document.getElementById("editor-add-nc").addEventListener("click", function () {
      if (state.role !== "editor" && state.role !== "admin") return;
      addNc();
    });

    document.getElementById("editor-areas-tbody").addEventListener("change", function (e) {
      var input = e.target.closest("[data-field]");
      if (!input) return;
      saveAreaField(input.closest("tr"), input.getAttribute("data-field"), input.value);
    });
    document.getElementById("editor-areas-tbody").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-area]");
      if (btn) removeArea(btn.getAttribute("data-remove-area"));
    });

    document.getElementById("editor-nc-tbody").addEventListener("change", function (e) {
      var input = e.target.closest("[data-field]");
      if (!input) return;
      saveNcField(input.closest("tr"), input.getAttribute("data-field"), input.value);
    });
    document.getElementById("editor-nc-tbody").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-nc]");
      if (btn) removeNc(btn.getAttribute("data-remove-nc"));
    });
  }

  // -----------------------------------------------------------------
  // Usuários (admin only)
  // -----------------------------------------------------------------
  function loadUsers() {
    return api.get("/api/users").then(function (users) {
      renderUsers(users || [], state.userId);
    }).catch(function (err) {
      showToast("Erro ao carregar usuários: " + err.message, true);
    });
  }

  function setupUsersInteractions() {
    document.getElementById("invite-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("invite-email").value.trim();
      var nome = document.getElementById("invite-nome").value.trim() || null;
      var password = document.getElementById("invite-password").value;
      var role = document.getElementById("invite-role").value;
      var statusEl = document.getElementById("invite-status");
      statusEl.className = "error-text"; statusEl.textContent = "Criando...";
      api.post("/api/users", { email: email, nome: nome, role: role, password: password }).then(function () {
        statusEl.textContent = "Usuário criado: " + email + ".";
        document.getElementById("invite-form").reset();
        loadUsers();
      }).catch(function (err) {
        statusEl.textContent = "Erro: " + err.message;
      });
    });

    document.getElementById("users-tbody").addEventListener("change", function (e) {
      var sel = e.target.closest("[data-user-role]");
      if (!sel) return;
      var userId = sel.getAttribute("data-user-role");
      var role = sel.value;
      api.patch("/api/users/" + userId + "/role", { role: role }).then(function () {
        showToast("Perfil atualizado.", false);
      }).catch(function (err) {
        showToast("Erro ao atualizar perfil: " + err.message, true);
        loadUsers();
      });
    });
  }

  // -----------------------------------------------------------------
  // Auth
  // -----------------------------------------------------------------
  function showApp() {
    document.getElementById("login-wrap").hidden = true;
    document.getElementById("app").hidden = false;
  }
  function showLogin() {
    document.getElementById("app").hidden = true;
    document.getElementById("login-wrap").hidden = false;
  }

  function bootstrapSession(user) {
    state.userId = user.id;
    state.userEmail = user.email;
    state.role = user.role;

    document.getElementById("user-email").textContent = state.userEmail;
    var pill = document.getElementById("user-role-pill");
    pill.textContent = state.role === "admin" ? "Administrador" : state.role === "editor" ? "Editor" : "Visualizador";
    pill.className = "role-pill role-" + state.role;
    document.getElementById("nav-users-li").hidden = state.role !== "admin";

    showApp();
    activatePanel("overview");
    refreshAndRender();
    startPolling();
    if (state.role === "admin") loadUsers();
  }

  function setupAuthInteractions() {
    setupPasswordToggle();

    document.getElementById("login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("login-email").value.trim();
      var password = document.getElementById("login-password").value;
      var errEl = document.getElementById("login-error");
      var submitBtn = document.getElementById("login-submit");
      errEl.textContent = ""; submitBtn.disabled = true;
      api.post("/api/auth/login", { email: email, password: password }).then(function (data) {
        submitBtn.disabled = false;
        setToken(data.token);
        bootstrapSession(data.user);
      }).catch(function (err) {
        submitBtn.disabled = false;
        errEl.textContent = err.message || "E-mail ou senha inválidos.";
      });
    });

    document.getElementById("signout-btn").addEventListener("click", function () {
      clearToken();
      stopPolling();
      showLogin();
    });
  }

  function setupPasswordToggle() {
    var input = document.getElementById("login-password");
    var btn = document.getElementById("password-toggle");
    btn.innerHTML = ICONS.eye;
    btn.addEventListener("click", function () {
      var showing = input.type === "text";
      input.type = showing ? "password" : "text";
      btn.innerHTML = showing ? ICONS.eye : ICONS.eye_off;
      btn.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
    });
  }

  function tryResumeSession() {
    if (!getToken()) { showLogin(); return; }
    api.get("/api/me").then(function (user) {
      bootstrapSession(user);
    }).catch(function () {
      // apiRequest já limpou o token e chamou showLogin() no caso de 401
    });
  }

  window.addEventListener("DOMContentLoaded", function () {
    fillStaticIcons();
    setupChromeInteractions();
    setupEditorInteractions();
    setupUsersInteractions();
    setupAuthInteractions();
    tryResumeSession();
  });
})();
