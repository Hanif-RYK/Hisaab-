/*!
 * Hisaab — app interactions. Vanilla JavaScript, no dependencies.
 * Each feature is opt-in through data-* attributes, so you can delete any part you don't use.
 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };
  var root = document.documentElement;

  /* Theme ---------------------------------------------------------------- */
  function setTheme(t) {
    root.setAttribute("data-theme", t);
    store.set("hisaab-theme", t);
    $$("[data-theme-toggle]").forEach(function (b) { b.setAttribute("aria-pressed", t === "dark"); });
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }
  $$("[data-theme-toggle]").forEach(function (b) {
    b.addEventListener("click", function () { setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark"); });
  });

  /* Sidebar -------------------------------------------------------------- */
  if (store.get("hisaab-collapsed") === "1") root.classList.add("sidebar-collapsed");
  $$("[data-sidebar-collapse]").forEach(function (b) {
    b.addEventListener("click", function () {
      var on = root.classList.toggle("sidebar-collapsed");
      store.set("hisaab-collapsed", on ? "1" : "0");
      setTimeout(function () { window.HisaabCharts && window.HisaabCharts.renderAll(); }, 30);
    });
  });
  $$("[data-sidebar-open]").forEach(function (b) { b.addEventListener("click", function () { root.classList.add("sidebar-open"); }); });
  $$("[data-sidebar-close], .sidebar-backdrop").forEach(function (b) { b.addEventListener("click", function () { root.classList.remove("sidebar-open"); }); });

  /* Dropdowns ------------------------------------------------------------ */
  $$("[data-dropdown]").forEach(function (dd) {
    var btn = $("[data-dropdown-toggle]", dd);
    if (!btn) return;
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = !dd.classList.contains("open");
      closeDropdowns();
      dd.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open);
    });
  });
  function closeDropdowns() {
    $$("[data-dropdown].open").forEach(function (d) { d.classList.remove("open"); var b = $("[data-dropdown-toggle]", d); if (b) b.setAttribute("aria-expanded", "false"); });
  }
  document.addEventListener("click", function (e) { if (!e.target.closest(".menu")) closeDropdowns(); });

  /* Modals --------------------------------------------------------------- */
  var lastFocus = null;
  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    var f = $("input, select, textarea, button:not([data-modal-close])", m);
    if (f) setTimeout(function () { if (!m.contains(document.activeElement)) f.focus(); }, 30);
  }
  function closeModal(m) {
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }
  $$("[data-modal-open]").forEach(function (b) { b.addEventListener("click", function () { openModal(b.getAttribute("data-modal-open")); }); });
  $$("[data-modal-close]").forEach(function (b) { b.addEventListener("click", function () { closeModal(b.closest(".modal")); }); });
  $$(".modal-backdrop").forEach(function (b) { b.addEventListener("click", function () { closeModal(b.closest(".modal")); }); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      $$(".modal.open").forEach(closeModal);
      closeDropdowns();
      root.classList.remove("sidebar-open");
    }
    var typing = /input|textarea|select/i.test((e.target.tagName || "")) || e.target.isContentEditable;
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
      var s = $(".search input");
      if (s && getComputedStyle(s).display !== "none") { e.preventDefault(); s.focus(); }
    }
  });

  /* Toasts --------------------------------------------------------------- */
  function toast(msg) {
    var wrap = $(".toasts");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toasts"; wrap.setAttribute("aria-live", "polite"); document.body.appendChild(wrap); }
    var t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span></span>';
    t.querySelector("span").textContent = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  window.hisaabToast = toast;
  $$("[data-toast]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.closest(".menu")) closeDropdowns();
      var m = b.closest(".modal");
      if (m && b.hasAttribute("data-modal-submit")) {
        var form = $("form", m);
        if (form && !validate(form)) return;
        if (form && form.hasAttribute("data-add-to")) addFromForm(form);
        if (form) form.reset();
        closeModal(m);
      }
      toast(b.getAttribute("data-toast"));
    });
  });

  /* Tabs ----------------------------------------------------------------- */
  $$("[data-tabs]").forEach(function (group) {
    var tabs = $$('[role="tab"]', group);
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var i = tabs.indexOf(tab);
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); select(tabs[(i + 1) % tabs.length], true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); select(tabs[(i - 1 + tabs.length) % tabs.length], true); }
      });
    });
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on);
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
      window.HisaabCharts && window.HisaabCharts.renderAll();
    }
  });
  $$(".segmented").forEach(function (seg) {
    $$("button", seg).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("button", seg).forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
        var target = seg.getAttribute("data-target");
        var data = b.getAttribute("data-set");
        if (target && data) {
          var chart = document.getElementById(target);
          chart.setAttribute("data-chart", data);
          window.HisaabCharts.render(chart);
        }
      });
    });
  });

  /* Data table: search, filter, sort, paginate ---------------------------- */
  $$("[data-table]").forEach(function (wrap) {
    var table = $("table", wrap), tbody = $("tbody", table);
    var rows = $$("tr", tbody);
    var perPage = parseInt(wrap.getAttribute("data-per-page") || "8", 10);
    var search = $("[data-table-search]", wrap), filter = $("[data-table-filter]", wrap);
    var pager = $("[data-table-pager]", wrap), info = $("[data-table-info]", wrap);
    var page = 1, sortCol = -1, dir = 1, visible = rows;
    var empty = document.createElement("tr");
    empty.className = "empty-row";
    empty.innerHTML = '<td colspan="' + $$("th", table).length + '">No results match your search. Try a different word or clear the filter.</td>';

    function cellVal(tr, i) {
      var td = tr.children[i];
      // Use data-value when present (dates, money); otherwise numbers sort numerically, text alphabetically.
      var v = td.hasAttribute("data-value") ? td.getAttribute("data-value") : td.textContent.trim();
      if (/^[\s$€£\-+]*[\d.,]+\s*%?$/.test(v)) return parseFloat(v.replace(/[^0-9.\-]/g, ""));
      return v.toLowerCase();
    }
    function apply() {
      var q = search ? search.value.trim().toLowerCase() : "";
      var f = filter ? filter.value : "";
      visible = rows.filter(function (tr) {
        return (!q || tr.textContent.toLowerCase().indexOf(q) > -1) && (!f || tr.getAttribute("data-status") === f);
      });
      if (sortCol > -1) visible.sort(function (a, b) { var x = cellVal(a, sortCol), y = cellVal(b, sortCol); return x > y ? dir : x < y ? -dir : 0; });
      var pages = Math.max(1, Math.ceil(visible.length / perPage));
      page = Math.min(page, pages);
      tbody.innerHTML = "";
      var slice = visible.slice((page - 1) * perPage, page * perPage);
      slice.forEach(function (tr) { tbody.appendChild(tr); });
      if (!slice.length) tbody.appendChild(empty);
      if (info) info.textContent = visible.length ? "Showing " + ((page - 1) * perPage + 1) + "–" + ((page - 1) * perPage + slice.length) + " of " + visible.length : "No results";
      if (pager) {
        pager.innerHTML = "";
        var mk = function (label, p, dis, act) {
          var b = document.createElement("button");
          b.type = "button"; b.innerHTML = label; b.disabled = dis;
          if (act) { b.className = "active"; b.setAttribute("aria-current", "page"); }
          b.setAttribute("aria-label", typeof p === "number" ? "Page " + p : label);
          b.addEventListener("click", function () { page = p; apply(); });
          pager.appendChild(b);
        };
        mk("‹", page - 1, page === 1);
        for (var i = 1; i <= pages; i++) mk(String(i), i, false, i === page);
        mk("›", page + 1, page === pages);
      }
    }
    $$("th[data-sort]", table).forEach(function (th) {
      th.tabIndex = 0;
      var go = function () {
        var i = Array.prototype.indexOf.call(th.parentNode.children, th);
        dir = sortCol === i ? -dir : 1; sortCol = i;
        $$("th[data-sort]", table).forEach(function (t) { t.removeAttribute("data-dir"); t.removeAttribute("aria-sort"); });
        th.setAttribute("data-dir", dir === 1 ? "asc" : "desc");
        th.setAttribute("aria-sort", dir === 1 ? "ascending" : "descending");
        apply();
      };
      th.addEventListener("click", go);
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    if (search) search.addEventListener("input", function () { page = 1; apply(); });
    if (filter) filter.addEventListener("change", function () { page = 1; apply(); });
    // Small API so other features (add row, row actions, export) can work with this table
    wrap.hisaabTable = {
      add: function (tr) { rows.unshift(tr); page = 1; apply(); },
      remove: function (tr) { rows = rows.filter(function (r) { return r !== tr; }); apply(); },
      refresh: apply,
      visibleRows: function () { return visible.slice(); }
    };
    var all = $("[data-check-all]", table);
    if (all) all.addEventListener("change", function () { $$("tbody input[type=checkbox]", table).forEach(function (c) { c.checked = all.checked; }); });
    apply();
  });

  /* Kanban drag & drop --------------------------------------------------- */
  $$("[data-kanban]").forEach(function (board) {
    var dragging = null;
    function counts() { $$(".column", board).forEach(function (c) { var n = $(".column-count", c); if (n) n.textContent = $$(".task", c).length; }); }
    function bindTask(t) {
      t.setAttribute("draggable", "true");
      t.addEventListener("dragstart", function (e) { dragging = t; t.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; try { e.dataTransfer.setData("text/plain", ""); } catch (x) {} });
      t.addEventListener("dragend", function () { t.classList.remove("dragging"); dragging = null; $$(".column-list", board).forEach(function (l) { l.classList.remove("is-over"); }); counts(); });
    }
    $$(".task", board).forEach(bindTask);
    $$(".column-list", board).forEach(function (list) {
      list.addEventListener("dragover", function (e) {
        e.preventDefault();
        list.classList.add("is-over");
        if (!dragging) return;
        var after = $$(".task:not(.dragging)", list).find(function (t) { var r = t.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
        if (after) list.insertBefore(dragging, after); else list.appendChild(dragging);
      });
      list.addEventListener("dragleave", function (e) { if (!list.contains(e.relatedTarget)) list.classList.remove("is-over"); });
      list.addEventListener("drop", function (e) { e.preventDefault(); list.classList.remove("is-over"); });
    });
    $$(".add-task", board).forEach(function (b) {
      b.addEventListener("click", function () {
        var title = window.prompt("Task title");
        if (!title) return;
        var t = document.createElement("article");
        t.className = "task";
        t.innerHTML = '<span class="badge badge-info">New</span><h4></h4><div class="task-meta"><span>Just added</span></div>';
        $("h4", t).textContent = title;
        $(".column-list", b.closest(".column")).appendChild(t);
        bindTask(t); counts(); toast("Task added");
      });
    });
    counts();
  });

  /* Calendar ------------------------------------------------------------- */
  $$("[data-calendar]").forEach(function (cal) {
    var grid = $(".cal-grid", cal), title = $("[data-cal-title]", cal);
    var events = [];
    try { events = JSON.parse($("script[type='application/json']", cal).textContent); } catch (e) {}
    var today = new Date(), view = new Date(today.getFullYear(), today.getMonth(), 1);
    var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    function draw() {
      grid.innerHTML = "";
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach(function (d) { var h = document.createElement("div"); h.className = "cal-dow"; h.textContent = d; grid.appendChild(h); });
      title.textContent = months[view.getMonth()] + " " + view.getFullYear();
      var start = new Date(view); start.setDate(1 - ((view.getDay() + 6) % 7));
      for (var i = 0; i < 42; i++) {
        var d = new Date(start); d.setDate(start.getDate() + i);
        var cell = document.createElement("div");
        cell.className = "cal-day" + (d.getMonth() !== view.getMonth() ? " other" : "") + (d.toDateString() === today.toDateString() ? " today" : "");
        cell.innerHTML = '<span class="d">' + d.getDate() + "</span>";
        events.forEach(function (ev) {
          // Demo events are placed relative to the current month so the calendar never looks empty.
          if (d.getMonth() === view.getMonth() && d.getDate() === ev.day) {
            var e = document.createElement("span");
            e.className = "event ev-" + (ev.type || 1);
            e.textContent = (ev.time ? ev.time + " " : "") + ev.title;
            e.title = e.textContent;
            cell.appendChild(e);
          }
        });
        grid.appendChild(cell);
      }
    }
    $$("[data-cal-nav]", cal).forEach(function (b) {
      b.addEventListener("click", function () {
        var n = b.getAttribute("data-cal-nav");
        view = n === "today" ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(view.getFullYear(), view.getMonth() + parseInt(n, 10), 1);
        draw();
      });
    });
    draw();
  });

  /* Forms ---------------------------------------------------------------- */
  $$("[data-password-toggle]").forEach(function (b) {
    b.addEventListener("click", function () {
      var input = $("input", b.closest(".input-wrap"));
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      b.setAttribute("aria-label", show ? "Hide password" : "Show password");
      b.setAttribute("aria-pressed", show);
    });
  });
  function validate(form) {
    var ok = true;
    $$("[required]", form).forEach(function (f) {
      var bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value)) || (f.minLength > 0 && f.value.length < f.minLength);
      f.classList.toggle("is-invalid", bad);
      f.setAttribute("aria-invalid", bad);
      if (bad && ok) { f.focus(); ok = false; }
    });
    return ok;
  }
  $$("form[data-validate]").forEach(function (form) {
    form.setAttribute("novalidate", "");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var go = form.getAttribute("data-redirect");
      var msg = form.getAttribute("data-success");
      if (msg) toast(msg);
      var btn = $("[type=submit]", form), note = $("[data-saved-note]", form);
      if (btn && form.hasAttribute("data-saved-label")) {
        var orig = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + form.getAttribute("data-saved-label");
        btn.disabled = true;
        setTimeout(function () { btn.innerHTML = orig; btn.disabled = false; }, 2200);
      }
      if (note) { note.hidden = false; note.textContent = "Saved at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
      if (go) setTimeout(function () { location.href = go; }, 600);
    });
    $$("[required]", form).forEach(function (f) { f.addEventListener("input", function () { if (f.classList.contains("is-invalid")) { f.classList.remove("is-invalid"); f.removeAttribute("aria-invalid"); } }); });
  });
  $$(".dropzone").forEach(function (z) {
    var input = $("input[type=file]", z), label = $("[data-dropzone-label]", z);
    var show = function (files) { if (label && files.length) label.textContent = files.length === 1 ? files[0].name : files.length + " files selected"; };
    z.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
    z.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { show(input.files); });
    ["dragenter", "dragover"].forEach(function (t) { z.addEventListener(t, function (e) { e.preventDefault(); z.classList.add("is-over"); }); });
    ["dragleave", "drop"].forEach(function (t) { z.addEventListener(t, function (e) { e.preventDefault(); z.classList.remove("is-over"); }); });
    z.addEventListener("drop", function (e) { show(e.dataTransfer.files); });
  });
  $$("[data-print]").forEach(function (b) { b.addEventListener("click", function () { window.print(); }); });
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast("Copied to clipboard"); }, function () { toast("Copy failed — select the text and copy it manually"); });
    });
  });


  /* Add items from modal forms ----------------------------------------------
     <form data-add-to="#target" data-template="tpl-id"> + <template id="tpl-id">
     Inside the template, {field} is replaced with the value of the form field named "field". */
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function addFromForm(form) {
    var tpl = document.getElementById(form.getAttribute("data-template"));
    var target = $(form.getAttribute("data-add-to"));
    if (!tpl || !target) return;
    var vals = { today: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }), iso: new Date().toISOString().slice(0, 10), id: String(Math.floor(4822 + Math.random() * 100)) };
    $$("[name]", form).forEach(function (f) {
      var v = f.type === "checkbox" ? (f.checked ? "Yes" : "No") : f.value.trim();
      vals[f.name] = v;
      if (f.name === "name" || f.name === "contact") {
        var parts = v.split(/\s+/);
        vals.initials = ((parts[0] || "?")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
      }
    });
    if (vals.amount) vals.money = "$" + Number(String(vals.amount).replace(/[^0-9.]/g, "") || 0).toLocaleString("en-US");
    var html = tpl.innerHTML.replace(/\{(\w+)\}/g, function (_, k) { return k in vals ? esc(vals[k]) : ""; });
    var holder = document.createElement(target.tagName === "TBODY" || target.hasAttribute("data-table") ? "tbody" : "div");
    holder.innerHTML = html.trim();
    var el = holder.firstElementChild;
    var table = target.closest("[data-table]") || (target.hasAttribute("data-table") ? target : null);
    if (table && table.hisaabTable) table.hisaabTable.add(el);
    else target.insertBefore(el, target.firstChild);
    bindWithin(el);
  }
  // Re-bind dropdowns and toasts inside newly added rows
  function bindWithin(el) {
    $$("[data-dropdown]", el).forEach(function (dd) {
      var btn = $("[data-dropdown-toggle]", dd);
      btn.addEventListener("click", function (e) { e.stopPropagation(); var open = !dd.classList.contains("open"); closeDropdowns(); dd.classList.toggle("open", open); });
    });
    $$("[data-toast]", el).forEach(function (b) { b.addEventListener("click", function () { closeDropdowns(); toast(b.getAttribute("data-toast")); }); });
  }

  /* Row actions: data-row-action="status|Shipped|info" or "remove" ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-row-action]");
    if (!b) return;
    var tr = b.closest("tr"), wrap = b.closest("[data-table]");
    var parts = b.getAttribute("data-row-action").split("|");
    closeDropdowns();
    if (parts[0] === "remove") {
      if (wrap && wrap.hisaabTable) wrap.hisaabTable.remove(tr); else tr.remove();
      toast(b.getAttribute("data-done") || "Removed");
    } else if (parts[0] === "status") {
      var badge = $(".badge", tr.querySelector("[data-status-cell]") || tr);
      if (badge) { badge.className = "badge badge-" + parts[2]; badge.textContent = parts[1]; }
      tr.setAttribute("data-status", parts[1]);
      toast(b.getAttribute("data-done") || "Status changed to " + parts[1]);
    }
  });

  /* CSV export ------------------------------------------------------------
     data-export="file.csv" plus one of:
       data-export-table   → the table inside the nearest [data-table] (current search/filter applied)
       data-export-chart="#chartId" → labels + series from a chart
       data-export-items="selector" → elements with data-csv='{"Column":"value",...}' */
  function csvCell(v) { v = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, rowsArr) {
    var csv = rowsArr.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n");
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    toast("Downloaded " + name + " (" + (rowsArr.length - 1) + " rows)");
  }
  $$("[data-export]").forEach(function (b) {
    b.addEventListener("click", function () {
      var name = b.getAttribute("data-export"), out = [];
      if (b.hasAttribute("data-export-table")) {
        var wrap = b.closest("[data-table]"), table = $("table", wrap);
        var keep = $$("th", table).map(function (th, i) { return th.textContent.trim() && !$("input", th) && !$(".sr-only", th) ? i : -1; }).filter(function (i) { return i > -1; });
        out.push(keep.map(function (i) { return $$("th", table)[i].textContent.trim(); }));
        wrap.hisaabTable.visibleRows().forEach(function (tr) { out.push(keep.map(function (i) { var td = tr.children[i]; var b2 = $(".person b", td); var sm = $(".person small", td); return b2 ? b2.textContent + (sm && sm.textContent.indexOf("@") > -1 ? " <" + sm.textContent + ">" : "") : td.textContent.trim(); })); });
      } else if (b.hasAttribute("data-export-chart")) {
        var cfg = JSON.parse($(b.getAttribute("data-export-chart")).getAttribute("data-chart"));
        out.push(["Label"].concat(cfg.series.map(function (s) { return s.name + (cfg.suffix === "k" ? " (thousands)" : ""); })));
        cfg.labels.forEach(function (l, i) { out.push([l].concat(cfg.series.map(function (s) { return s.data[i]; }))); });
      } else if (b.hasAttribute("data-export-items")) {
        var items = $$(b.getAttribute("data-export-items")).filter(function (el) { return !el.hidden; }).map(function (el) { return JSON.parse(el.getAttribute("data-csv")); });
        if (items.length) { var cols = Object.keys(items[0]); out.push(cols); items.forEach(function (it) { out.push(cols.map(function (c) { return it[c]; })); }); }
      }
      if (out.length > 1) download(name, out); else toast("Nothing to export with the current filter");
    });
  });

  /* CSV import (demo: counts rows in the chosen file) ----------------------- */
  $$("[data-import]").forEach(function (b) {
    b.addEventListener("click", function () {
      var m = b.closest(".modal"), input = $("input[type=file]", m);
      var f = input && input.files[0];
      if (!f) { toast("Choose a CSV file first"); return; }
      var r = new FileReader();
      r.onload = function () {
        var n = String(r.result).split(/\r?\n/).filter(function (l) { return l.trim(); }).length - 1;
        closeModal(m);
        toast(Math.max(0, n) + " products found in " + f.name + ". Connect your backend to save them.");
      };
      r.readAsText(f);
    });
  });

  /* Filterable card lists: [data-filter-list] with [data-filter-search] and [data-filter-tag] buttons */
  $$("[data-filter-list]").forEach(function (box) {
    var items = $$(box.getAttribute("data-filter-list")), q = $("[data-filter-search]", box), tag = "", empty = $("[data-filter-empty]", box.parentNode);
    function run() {
      var term = q ? q.value.trim().toLowerCase() : "", shown = 0;
      items.forEach(function (it) {
        var ok = (!term || it.textContent.toLowerCase().indexOf(term) > -1) && (!tag || it.getAttribute("data-tag") === tag);
        it.hidden = !ok; if (ok) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    }
    if (q) q.addEventListener("input", run);
    $$("[data-filter-tag]", box).forEach(function (b) { b.addEventListener("click", function () { tag = b.getAttribute("data-filter-tag"); run(); }); });
  });

  /* Calendar colour filters */
  $$("[data-cal-toggle]").forEach(function (c) {
    c.addEventListener("change", function () { var cal = $("[data-calendar]"); if (cal) cal.classList.toggle("hide-ev-" + c.getAttribute("data-cal-toggle"), !c.checked); });
  });

  /* Date range picker (dropdown options update the button label) */
  $$("[data-range]").forEach(function (dd) {
    $$("[data-range-option]", dd).forEach(function (o) {
      o.addEventListener("click", function () {
        $("[data-range-label]", dd).textContent = o.textContent;
        closeDropdowns();
        toast("Showing " + o.textContent.toLowerCase());
      });
    });
  });

  /* Notifications: mark all as read */
  $$("[data-mark-read]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      $$(".topbar .dot").forEach(function (d) { d.remove(); });
      $$(".notif").forEach(function (n) { n.style.opacity = ".55"; });
      toast("All notifications marked as read");
    });
  });

  /* Global search: Enter opens Orders with the search filled in */
  var gs = $(".search input");
  if (gs) gs.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && gs.value.trim()) location.href = "orders.html?q=" + encodeURIComponent(gs.value.trim());
  });
  var qp = new URLSearchParams(location.search).get("q"), ts = $("[data-table-search]");
  if (qp && ts) { ts.value = qp; ts.dispatchEvent(new Event("input")); }

  /* Current year in footers */
  $$("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
