window.addEventListener("DOMContentLoaded", () => {
  const results = document.getElementById("results")
  const runBtn = document.getElementById("run")
  const detectBtn = document.getElementById("detect")
  const modelInput = document.getElementById("model")
  const hostInput = document.getElementById("host")
  const portInput = document.getElementById("port")
  const autoStart = document.getElementById("autoStart")
  const savePersonaBtn = document.getElementById("savePersona")
  const personaStatus = document.getElementById("personaStatus")
  const pName = document.getElementById("p_name")
  const pRegion = document.getElementById("p_region")
  const pRole = document.getElementById("p_role")
  const pInterests = document.getElementById("p_interests")
  const pDepth = document.getElementById("p_depth")
  const pNotifications = document.getElementById("p_notifications")

  // Prefill host/port from env defaults (overwrite any hardcoded)
  if (window.ollama && window.ollama.getDefaults) {
    window.ollama
      .getDefaults()
      .then((d) => {
        if (hostInput) hostInput.value = d.host || "127.0.0.1"
        if (portInput) portInput.value = String(d.port || "11434")
      })
      .catch(() => {})
  }

  async function runChecks() {
    results.innerHTML = "<em>Running…</em>"
    if (!window.ollama || !window.ollama.runChecks) {
      results.innerHTML = '<div class="err">Preload not loaded. window.ollama is undefined.</div>'
      return
    }
    const modelName = modelInput.value.trim()
    const allowAutoStart = autoStart.checked
    const host = hostInput.value.trim()
    const port = portInput.value.trim()
    try {
      const res = await window.ollama.runChecks(modelName, allowAutoStart, host, port)
      const lines = []
      lines.push(
        `<div>CLI installed: <b class="${res.cliInstalled ? "ok" : "err"}">${res.cliInstalled}</b> ${res.cliVersion ? "(" + res.cliVersion + ")" : ""}</div>`,
      )
      lines.push(`<div>Server running: <b class="${res.serverRunning ? "ok" : "err"}">${res.serverRunning}</b></div>`)
      lines.push(`<div>Model present: <b class="${res.modelPresent ? "ok" : "warn"}">${res.modelPresent}</b></div>`)
      lines.push(
        `<div>Test generation: <b class="${res.testGenerationOk ? "ok" : "warn"}">${res.testGenerationOk}</b>${res.testTimedOut ? " (timed out while loading model)" : ""}</div>`,
      )
      if (res.testOutput) {
        lines.push("<div>Output:</div>")
        lines.push(
          `<pre>${res.testOutput.replace(/[&<>]/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[s])}</pre>`,
        )
      }
      if (res.testError) {
        lines.push(
          '<div class="err">' +
            String(res.testError).replace(/[&<>]/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[s]) +
            "</div>",
        )
      }
      lines.push(`<div>Base URL: <code>${res.baseURL}</code></div>`)
      lines.push("<details><summary>Logs</summary><pre>" + JSON.stringify(res.logs, null, 2) + "</pre></details>")
      results.innerHTML = lines.join("")
    } catch (e) {
      results.innerHTML = `<div class="err">${String(e)}</div>`
    }
  }

  runBtn?.addEventListener("click", runChecks)

  detectBtn?.addEventListener("click", async () => {
    if (!window.ollama || !window.ollama.detect) return
    const res = await window.ollama.detect()
    if (hostInput) hostInput.value = res.host
    if (portInput) portInput.value = String(res.port)
    if (results) {
      const lines = []
      lines.push(`<div>Detected: <code>${res.host}:${res.port}</code></div>`)
      lines.push(
        "<details><summary>Detection Logs</summary><pre>" + JSON.stringify(res.logs, null, 2) + "</pre></details>",
      )
      results.innerHTML = lines.join("")
    }
  })

  // Persona load/save
  async function loadPersona() {
    if (!window.ollama?.persona?.load) return
    const res = await window.ollama.persona.load()
    if (res.exists && res.persona) {
      document.getElementById("p_name").value = res.persona.name || ""
      document.getElementById("p_region").value = res.persona.region || ""
      document.getElementById("p_role").value = res.persona.role || "Citizen"
      document.getElementById("p_interests").value = (res.persona.interests || []).join(", ")
      document.getElementById("p_depth").value = res.persona.depth || "summary"
      document.getElementById("p_notifications").value = res.persona.notifications || "weekly"

      updatePersonaPreview(res.persona)
      showPersonaStatus("Loaded saved persona", "success")
    }
  }

  async function savePersona() {
    if (!window.ollama?.persona?.save) return
    const persona = {
      name: document.getElementById("p_name").value.trim(),
      region: document.getElementById("p_region").value.trim(),
      role: document.getElementById("p_role").value,
      interests: document
        .getElementById("p_interests")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      depth: document.getElementById("p_depth").value,
      notifications: document.getElementById("p_notifications").value,
      updatedAt: new Date().toISOString(),
    }

    const res = await window.ollama.persona.save(persona)
    if (res.ok) {
      updatePersonaPreview(persona)
      showPersonaStatus("Persona saved successfully", "success")
      updateDashboardStats()
    } else {
      showPersonaStatus("Failed to save persona", "error")
    }
  }

  function updatePersonaPreview(persona) {
    const preview = document.getElementById("persona-preview")
    const content = document.getElementById("persona-summary-content")

    if (!persona.name && !persona.region && !persona.interests.length) {
      preview.style.display = "none"
      return
    }

    const interestsText = persona.interests.length > 0 ? persona.interests.join(", ") : "None specified"
    const locationText = persona.region || "Not specified"

    content.innerHTML = `
      <h4>${persona.name || "Anonymous"} - ${persona.role}</h4>
      <p><strong>Location:</strong> ${locationText}</p>
      <p><strong>Interests:</strong> ${interestsText}</p>
      <p><strong>Analysis Preference:</strong> ${persona.depth} level</p>
      <p><strong>Notifications:</strong> ${persona.notifications}</p>
    `

    preview.style.display = "block"
  }

  function showPersonaStatus(message, type) {
    const status = document.getElementById("persona-status")
    status.textContent = message
    status.className = `status-indicator status-${type}`
    status.classList.remove("hidden")

    setTimeout(() => {
      status.classList.add("hidden")
    }, 3000)
  }

  // Enhanced navigation system
  const navItems = document.querySelectorAll(".nav-item")
  const views = document.querySelectorAll(".view")

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetView = item.dataset.view

      // Update active nav item
      navItems.forEach((nav) => nav.classList.remove("active"))
      item.classList.add("active")

      // Show target view
      views.forEach((view) => view.classList.add("hidden"))
      document.getElementById(`${targetView}-view`).classList.remove("hidden")

      // Load view-specific data
      loadViewData(targetView)
    })
  })

  function loadViewData(viewName) {
    switch (viewName) {
      case "dashboard":
        loadDashboard()
        break
      case "regulations":
        loadRegulations()
        break
      case "comments":
        loadComments()
        break
      case "notifications":
        loadNotifications()
        break
    }
  }

  function loadDashboard() {
    updateDashboardStats()
    loadPriorityRegulations()
  }

  function updateDashboardStats() {
    // Mock data - in real app, this would come from your n8n workflow API
    document.getElementById("relevant-regulations").textContent = "12"
    document.getElementById("comments-submitted").textContent = "3"
    document.getElementById("days-until-deadline").textContent = "5"
    document.getElementById("engagement-score").textContent = "85%"
  }

  function loadPriorityRegulations() {
    const container = document.getElementById("priority-regulations")

    // Mock high-priority regulations
    const mockRegulations = [
      {
        id: "EPA-2024-001",
        title: "Clean Air Standards for Small Businesses",
        agency: "EPA",
        deadline: "2024-02-15",
        relevance: 92,
        summary: "Proposed updates to air quality standards that may affect small manufacturing businesses...",
      },
      {
        id: "DOT-2024-045",
        title: "Electric Vehicle Infrastructure Requirements",
        agency: "Department of Transportation",
        deadline: "2024-02-20",
        relevance: 87,
        summary: "New requirements for EV charging infrastructure in commercial developments...",
      },
    ]

    setTimeout(() => {
      container.innerHTML = mockRegulations.map((reg) => createRegulationCard(reg)).join("")
    }, 1000)
  }

  function loadRegulations() {
    const container = document.getElementById("regulations-list")

    // Mock broader regulation list
    const mockRegulations = [
      {
        id: "EPA-2024-001",
        title: "Clean Air Standards for Small Businesses",
        agency: "EPA",
        deadline: "2024-02-15",
        relevance: 92,
        summary:
          "Proposed updates to air quality standards that may affect small manufacturing businesses. The rule would establish new monitoring requirements and emission limits for facilities with fewer than 100 employees.",
      },
      {
        id: "DOT-2024-045",
        title: "Electric Vehicle Infrastructure Requirements",
        agency: "Department of Transportation",
        deadline: "2024-02-20",
        relevance: 87,
        summary:
          "New requirements for EV charging infrastructure in commercial developments. Property owners would need to install charging stations in parking lots with more than 50 spaces.",
      },
      {
        id: "FCC-2024-012",
        title: "Broadband Privacy Protection Rules",
        agency: "FCC",
        deadline: "2024-03-01",
        relevance: 78,
        summary:
          "Enhanced privacy protections for broadband customers, including opt-in consent requirements for data sharing and stronger security standards for ISPs.",
      },
    ]

    setTimeout(() => {
      container.innerHTML = mockRegulations.map((reg) => createRegulationCard(reg, true)).join("")
    }, 800)
  }

  function createRegulationCard(regulation, showFullActions = false) {
    const daysUntilDeadline = Math.ceil((new Date(regulation.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    const relevanceClass = regulation.relevance >= 80 ? "high" : regulation.relevance >= 50 ? "medium" : "low"

    return `
      <div class="regulation-card" data-regulation-id="${regulation.id}">
        <div class="regulation-header">
          <div>
            <div class="regulation-title">${regulation.title}</div>
            <div class="regulation-agency">${regulation.agency}</div>
          </div>
          <div class="relevance-score">
            <span>🎯</span> ${regulation.relevance}% match
          </div>
        </div>
        <div class="regulation-meta">
          <span>📅 Deadline: ${regulation.deadline}</span>
          <span>⏰ ${daysUntilDeadline} days left</span>
          <span>🏷️ ${regulation.id}</span>
        </div>
        <div class="regulation-summary">${regulation.summary}</div>
        <div class="regulation-actions">
          <button class="btn btn-primary" onclick="openCommentForm('${regulation.id}')">
            <span>💬</span> Comment
          </button>
          <button class="btn btn-secondary" onclick="viewFullRegulation('${regulation.id}')">
            <span>📖</span> Read Full Text
          </button>
          ${
            showFullActions
              ? `
            <button class="btn btn-secondary" onclick="analyzeImpact('${regulation.id}')">
              <span>🧠</span> AI Analysis
            </button>
            <button class="btn btn-secondary" onclick="trackRegulation('${regulation.id}')">
              <span>🔔</span> Track
            </button>
          `
              : ""
          }
        </div>
      </div>
    `
  }

  function loadComments() {
    // Mock comment history
    const container = document.getElementById("comments-list")
    const mockComments = [
      {
        regulationId: "EPA-2024-001",
        title: "Clean Air Standards for Small Businesses",
        submittedDate: "2024-01-15",
        status: "submitted",
        excerpt: "As a small business owner, I support these standards but request a 12-month implementation period...",
      },
    ]

    if (mockComments.length > 0) {
      container.innerHTML = mockComments
        .map(
          (comment) => `
        <div class="regulation-card">
          <div class="regulation-header">
            <div>
              <div class="regulation-title">${comment.title}</div>
              <div class="regulation-agency">Submitted ${comment.submittedDate}</div>
            </div>
            <div class="status-indicator status-success">
              <span>✓</span> ${comment.status}
            </div>
          </div>
          <div class="regulation-summary">${comment.excerpt}</div>
          <div class="regulation-actions">
            <button class="btn btn-secondary">View Full Comment</button>
            <button class="btn btn-secondary">Track Status</button>
          </div>
        </div>
      `,
        )
        .join("")
    }
  }

  function loadNotifications() {
    // Mock notifications
    const container = document.getElementById("notifications-list")
    const mockNotifications = [
      {
        type: "deadline",
        title: "Comment Deadline Approaching",
        message: "EPA Clean Air Standards deadline is in 5 days",
        time: "2 hours ago",
        unread: true,
      },
      {
        type: "new_regulation",
        title: "New Relevant Regulation",
        message: "DOT published new EV infrastructure requirements (87% match)",
        time: "1 day ago",
        unread: false,
      },
    ]

    if (mockNotifications.length > 0) {
      container.innerHTML = mockNotifications
        .map(
          (notif) => `
        <div class="regulation-card ${notif.unread ? "unread" : ""}">
          <div class="regulation-header">
            <div>
              <div class="regulation-title">${notif.title}</div>
              <div class="regulation-agency">${notif.time}</div>
            </div>
            ${notif.unread ? '<div class="status-indicator status-warning"><span>●</span> New</div>' : ""}
          </div>
          <div class="regulation-summary">${notif.message}</div>
        </div>
      `,
        )
        .join("")
    }
  }

  window.openCommentForm = (regulationId) => {
    // In a real app, this would open a comment composition interface
    alert(`Opening comment form for regulation ${regulationId}`)
  }

  window.viewFullRegulation = (regulationId) => {
    // In a real app, this would open the full regulation text
    alert(`Opening full text for regulation ${regulationId}`)
  }

  window.analyzeImpact = (regulationId) => {
    // In a real app, this would trigger AI analysis
    alert(`Running AI impact analysis for regulation ${regulationId}`)
  }

  window.trackRegulation = (regulationId) => {
    // In a real app, this would add to tracking list
    alert(`Now tracking regulation ${regulationId}`)
  }

  // Event listeners for existing functionality
  document.getElementById("savePersona")?.addEventListener("click", savePersona)
  document.getElementById("testPersona")?.addEventListener("click", () => {
    alert("Testing persona matching against current regulations...")
  })

  // Search and filter functionality
  document.getElementById("regulation-search")?.addEventListener("input", (e) => {
    // In a real app, this would filter the regulations list
    console.log("Searching for:", e.target.value)
  })

  document.getElementById("refresh-regulations")?.addEventListener("click", () => {
    document.getElementById("regulations-list").innerHTML =
      '<div class="loading"><div class="spinner"></div>Refreshing regulations...</div>'
    loadRegulations()
  })

  // Initialize the app
  loadPersona()
  loadDashboard()
})


