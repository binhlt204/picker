export function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="vi" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pickball Server • Backend Control Center</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="/socket.io/socket.io.js"></script>
  <style>
    :root {
      --bg-dark: #020617;
      --card-bg: rgba(15, 23, 42, 0.75);
      --card-border: rgba(51, 65, 85, 0.7);
      --accent-blue: #38bdf8;
      --accent-indigo: #6366f1;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #f43f5e;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.25) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(88, 28, 135, 0.2) 0px, transparent 50%);
      color: var(--text-main);
      min-height: 100vh;
      line-height: 1.5;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    
    /* Top Navbar */
    header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #6366f1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-live {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .dot-pulse {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-primary {
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: white;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.45);
    }
    .btn-secondary {
      background: rgba(30, 41, 59, 0.8);
      color: #cbd5e1;
      border: 1px solid rgba(51, 65, 85, 0.8);
    }
    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.8);
      color: white;
    }

    /* Container & Tabs */
    .container {
      max-width: 1280px;
      margin: 0 auto;
      padding: 28px 24px 60px;
    }
    .tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.6);
      margin-bottom: 28px;
      padding-bottom: 4px;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 14px;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .tab-btn:hover {
      color: white;
      background: rgba(30, 41, 59, 0.6);
    }
    .tab-btn.active {
      color: white;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.4);
      box-shadow: 0 0 16px rgba(59, 130, 246, 0.15);
    }

    /* Cards */
    .grid-kpi {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .card-kpi {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 18px;
      padding: 20px;
      backdrop-filter: blur(12px);
      transition: transform 0.2s;
    }
    .card-kpi:hover {
      transform: translateY(-2px);
      border-color: rgba(99, 102, 241, 0.4);
    }
    .kpi-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .kpi-value {
      font-size: 32px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      color: white;
    }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    @media (max-width: 900px) {
      .grid-2col { grid-template-columns: 1fr; }
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 24px;
      backdrop-filter: blur(12px);
    }
    .card-title {
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid rgba(51, 65, 85, 0.4);
      font-size: 13px;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: var(--text-muted); font-weight: 500; }
    .info-val { font-weight: 700; color: white; }

    /* Tables */
    .table-container {
      overflow-x: auto;
      border-radius: 14px;
      border: 1px solid rgba(51, 65, 85, 0.6);
      background: rgba(10, 15, 30, 0.7);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    th {
      background: rgba(30, 41, 59, 0.8);
      padding: 12px 16px;
      color: #94a3b8;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.8);
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(51, 65, 85, 0.3);
      color: #e2e8f0;
      max-width: 250px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    tr:hover td { background: rgba(30, 41, 59, 0.5); }

    /* Pill buttons for table selection */
    .pills-bar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .pill-btn {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(51, 65, 85, 0.6);
      color: #cbd5e1;
      padding: 6px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pill-btn.active {
      background: #0284c7;
      color: white;
      border-color: #38bdf8;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }

    /* API Tester code block */
    .endpoint-item {
      padding: 14px 18px;
      border-radius: 14px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.5);
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .endpoint-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge-method {
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .endpoint-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      font-weight: 600;
      color: white;
    }
    .endpoint-desc {
      font-size: 12px;
      color: #94a3b8;
    }
    pre.code-output {
      background: #090d16;
      border: 1px solid rgba(51, 65, 85, 0.6);
      border-radius: 12px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #38bdf8;
      overflow-x: auto;
      max-height: 340px;
      margin-top: 16px;
    }

    /* Tab content display */
    .tab-content { display: none; }
    .tab-content.active { display: block; }
  </style>
</head>
<body>

  <!-- Top Navigation -->
  <header>
    <div class="brand">
      <div class="brand-icon">⚡</div>
      <div>
        <div class="brand-title">
          <span>PICKBALL SERVER</span>
          <span class="badge-live"><span class="dot-pulse"></span> PORT 3001</span>
        </div>
        <div style="font-size: 11px; color: var(--text-muted);">Backend & Realtime Control Center</div>
      </div>
    </div>

    <div class="nav-actions">
      <button class="btn btn-secondary" onclick="seedDatabase()" id="btn-seed">
        🌱 Nạp Dữ Liệu Mẫu
      </button>
      <a href="http://localhost:3000" target="_blank" class="btn btn-primary">
        🚀 Mở Web App (Port 3000)
      </a>
    </div>
  </header>

  <div class="container">
    <!-- Tabs Navigation -->
    <div class="tabs-nav">
      <button class="tab-btn active" onclick="switchTab('overview')">
        📊 Tổng Quan Hệ Thống
      </button>
      <button class="tab-btn" onclick="switchTab('database')">
        🗄️ Cơ Sở Dữ Liệu SQLite
      </button>
      <button class="tab-btn" onclick="switchTab('api-tester')">
        ⚡ Thử Nghiệm REST API
      </button>
      <button class="tab-btn" onclick="switchTab('websocket')">
        📡 WebSocket Realtime Live
      </button>
    </div>

    <!-- TAB 1: OVERVIEW -->
    <div id="tab-overview" class="tab-content active">
      <!-- KPI Counts -->
      <div class="grid-kpi">
        <div class="card-kpi">
          <div class="kpi-title">Lớp Học (Classrooms) <span>🏫</span></div>
          <div class="kpi-value" id="count-classrooms">-</div>
        </div>
        <div class="card-kpi">
          <div class="kpi-title">Học Sinh (Students) <span>👨‍🎓</span></div>
          <div class="kpi-value" id="count-students">-</div>
        </div>
        <div class="card-kpi">
          <div class="kpi-title">Bộ Đề (Quizzes) <span>📝</span></div>
          <div class="kpi-value" id="count-quizzes">-</div>
        </div>
        <div class="card-kpi">
          <div class="kpi-title">Câu Hỏi (Questions) <span>❓</span></div>
          <div class="kpi-value" id="count-questions">-</div>
        </div>
        <div class="card-kpi">
          <div class="kpi-title">Phiên Thi (Sessions) <span>🎯</span></div>
          <div class="kpi-value" id="count-sessions">-</div>
        </div>
        <div class="card-kpi">
          <div class="kpi-title">Câu Đã Trả Lời <span>✅</span></div>
          <div class="kpi-value" id="count-answers">-</div>
        </div>
      </div>

      <!-- 2 Columns: Server info & Database info -->
      <div class="grid-2col">
        <div class="card">
          <div class="card-title">🖥️ Trạng Thái Máy Chủ (Server Metrics)</div>
          <div class="info-row">
            <span class="info-label">Trạng thái</span>
            <span class="info-val" style="color: #34d399;">● Hoạt động ổn định (Online)</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cổng lắng nghe (Port)</span>
            <span class="info-val mono">3001</span>
          </div>
          <div class="info-row">
            <span class="info-label">Thời gian chạy (Uptime)</span>
            <span class="info-val mono" id="server-uptime">-</span>
          </div>
          <div class="info-row">
            <span class="info-label">Phiên bản Node.js</span>
            <span class="info-val mono" id="node-version">-</span>
          </div>
          <div class="info-row">
            <span class="info-label">Bộ nhớ sử dụng (RSS RAM)</span>
            <span class="info-val mono" id="server-ram">-</span>
          </div>
          <div class="info-row">
            <span class="info-label">Giao thức Realtime</span>
            <span class="info-val mono" style="color: #38bdf8;">Socket.io v4</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">📁 Cơ Sở Dữ Liệu SQLite (Database Engine)</div>
          <div class="info-row">
            <span class="info-label">Hệ quản trị CSDL</span>
            <span class="info-val" style="color: #60a5fa;">SQLite 3 via better-sqlite3</span>
          </div>
          <div class="info-row">
            <span class="info-label">Chế độ ghi (Journal Mode)</span>
            <span class="info-val mono" style="color: #34d399;">WAL (Write-Ahead Logging)</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ràng buộc khóa ngoại</span>
            <span class="info-val mono">ON (Foreign Keys Active)</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kích thước file CSDL</span>
            <span class="info-val mono" id="db-size">-</span>
          </div>
          <div class="info-row">
            <span class="info-label">Đường dẫn lưu file</span>
            <span class="info-val mono" style="font-size: 11px; max-width: 260px;" id="db-path" title="">-</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: DATABASE EXPLORER -->
    <div id="tab-database" class="tab-content">
      <div class="card">
        <div class="card-title">🗄️ Trình Xem Bảng CSDL (Table Explorer)</div>
        <div class="pills-bar">
          <button class="pill-btn active" onclick="loadTableData('classrooms', this)">classrooms</button>
          <button class="pill-btn" onclick="loadTableData('students', this)">students</button>
          <button class="pill-btn" onclick="loadTableData('quizzes', this)">quizzes</button>
          <button class="pill-btn" onclick="loadTableData('questions', this)">questions</button>
          <button class="pill-btn" onclick="loadTableData('exam_sessions', this)">exam_sessions</button>
          <button class="pill-btn" onclick="loadTableData('session_answers', this)">session_answers</button>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: var(--text-muted);">
          <span>Đang hiển thị bảng: <strong id="current-table-name" style="color: white;">classrooms</strong> (<span id="current-table-count">0</span> bản ghi)</span>
          <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 11px;" onclick="refreshCurrentTable()">Tải Lại</button>
        </div>

        <div class="table-container">
          <table id="data-table">
            <thead id="data-table-head">
              <tr><th>Đang tải...</th></tr>
            </thead>
            <tbody id="data-table-body">
              <tr><td>Vui lòng đợi trong giây lát...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: REST API TESTER -->
    <div id="tab-api-tester" class="tab-content">
      <div class="card">
        <div class="card-title">⚡ Danh Sách & Thử Nghiệm REST API Trực Tiếp</div>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px;">
          Bấm nút "Thử Nghiệm" để gọi API trực tiếp và xem kết quả JSON trả về.
        </p>

        <div class="endpoint-item">
          <div class="endpoint-left">
            <span class="badge-method">GET</span>
            <div>
              <div class="endpoint-path">/api/classrooms</div>
              <div class="endpoint-desc">Lấy danh sách tất cả lớp học trong hệ thống</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="testEndpoint('/api/classrooms')">Thử Nghiệm</button>
        </div>

        <div class="endpoint-item">
          <div class="endpoint-left">
            <span class="badge-method">GET</span>
            <div>
              <div class="endpoint-path">/api/quizzes</div>
              <div class="endpoint-desc">Lấy danh sách các bộ đề thi và số câu hỏi</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="testEndpoint('/api/quizzes')">Thử Nghiệm</button>
        </div>

        <div class="endpoint-item">
          <div class="endpoint-left">
            <span class="badge-method">GET</span>
            <div>
              <div class="endpoint-path">/api/sessions</div>
              <div class="endpoint-desc">Lấy danh sách phiên kiểm tra và trạng thái</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="testEndpoint('/api/sessions')">Thử Nghiệm</button>
        </div>

        <div class="endpoint-item">
          <div class="endpoint-left">
            <span class="badge-method">GET</span>
            <div>
              <div class="endpoint-path">/api/health</div>
              <div class="endpoint-desc">Kiểm tra trạng thái máy chủ (Healthcheck)</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="testEndpoint('/api/health')">Thử Nghiệm</button>
        </div>

        <div class="endpoint-item">
          <div class="endpoint-left">
            <span class="badge-method">GET</span>
            <div>
              <div class="endpoint-path">/api/admin/overview</div>
              <div class="endpoint-desc">Lấy thông số hệ thống, RAM, số lượng bản ghi</div>
            </div>
          </div>
          <button class="btn btn-primary" onclick="testEndpoint('/api/admin/overview')">Thử Nghiệm</button>
        </div>

        <!-- Output block -->
        <div style="margin-top: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 700; font-size: 13px;">Kết quả JSON Trả Về (<span id="api-status" class="mono">-</span>):</span>
            <span id="api-time" class="mono" style="font-size: 12px; color: var(--accent-emerald);">-</span>
          </div>
          <pre class="code-output" id="api-output">// Bấm nút "Thử Nghiệm" ở trên để xem phản hồi...</pre>
        </div>
      </div>
    </div>

    <!-- TAB 4: WEBSOCKET LIVE -->
    <div id="tab-websocket" class="tab-content">
      <div class="card">
        <div class="card-title">📡 WebSocket Realtime Live Monitor</div>
        <div class="info-row">
          <span class="info-label">Trạng thái kết nối Socket.io</span>
          <span class="info-val mono" id="ws-status" style="color: #34d399;">● Đang kết nối...</span>
        </div>
        <div class="info-row">
          <span class="info-label">Socket ID hiện tại</span>
          <span class="info-val mono" id="ws-socket-id">-</span>
        </div>

        <div style="margin-top: 20px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 8px;">Nhật ký sự kiện WebSocket (Live Event Log):</div>
          <pre class="code-output" id="ws-log" style="height: 280px;">[System] Đang lắng nghe sự kiện WebSocket realtime trên cổng 3001...</pre>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentTable = 'classrooms';

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      event.currentTarget.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');

      if (tabId === 'database') {
        loadTableData(currentTable);
      }
    }

    // Load Overview Stats
    async function fetchOverview() {
      try {
        const res = await fetch('/api/admin/overview');
        const data = await res.json();

        document.getElementById('count-classrooms').textContent = data.counts.classrooms || 0;
        document.getElementById('count-students').textContent = data.counts.students || 0;
        document.getElementById('count-quizzes').textContent = data.counts.quizzes || 0;
        document.getElementById('count-questions').textContent = data.counts.questions || 0;
        document.getElementById('count-sessions').textContent = data.counts.exam_sessions || 0;
        document.getElementById('count-answers').textContent = data.counts.session_answers || 0;

        document.getElementById('node-version').textContent = data.server.nodeVersion;
        document.getElementById('server-ram').textContent = data.server.memoryRssMb + ' MB';
        document.getElementById('db-size').textContent = data.database.sizeKb + ' KB';
        document.getElementById('db-path').textContent = data.database.path;
        document.getElementById('db-path').title = data.database.path;

        const uptime = data.server.uptimeSeconds;
        const mins = Math.floor(uptime / 60);
        const secs = uptime % 60;
        document.getElementById('server-uptime').textContent = \`\${mins} phút \${secs} giây\`;
      } catch (err) {
        console.error('Lỗi tải overview:', err);
      }
    }

    // Load Database Table Rows
    async function loadTableData(tableName, btnElement) {
      currentTable = tableName;
      if (btnElement) {
        document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
      }

      document.getElementById('current-table-name').textContent = tableName;
      const head = document.getElementById('data-table-head');
      const body = document.getElementById('data-table-body');

      head.innerHTML = '<tr><th>Đang tải...</th></tr>';
      body.innerHTML = '<tr><td>Đang lấy dữ liệu...</td></tr>';

      try {
        const res = await fetch('/api/admin/tables/' + tableName);
        const data = await res.json();
        document.getElementById('current-table-count').textContent = data.total;

        if (data.columns.length === 0) {
          head.innerHTML = '<tr><th>Thông báo</th></tr>';
          body.innerHTML = '<tr><td>Bảng hiện đang trống, chưa có dữ liệu.</td></tr>';
          return;
        }

        let thHtml = '<tr>';
        data.columns.forEach(col => thHtml += \`<th>\${col}</th>\`);
        thHtml += '</tr>';
        head.innerHTML = thHtml;

        let trHtml = '';
        data.rows.forEach(row => {
          trHtml += '<tr>';
          data.columns.forEach(col => {
            const val = row[col] !== null && row[col] !== undefined ? row[col] : '—';
            trHtml += \`<td title="\${val}">\${val}</td>\`;
          });
          trHtml += '</tr>';
        });
        body.innerHTML = trHtml;
      } catch (err) {
        head.innerHTML = '<tr><th>Lỗi</th></tr>';
        body.innerHTML = \`<tr><td>Không thể tải bảng: \${err.message}</td></tr>\`;
      }
    }

    function refreshCurrentTable() {
      loadTableData(currentTable);
    }

    // Seed Data Action
    async function seedDatabase() {
      const btn = document.getElementById('btn-seed');
      btn.textContent = '⏳ Đang nạp...';
      try {
        const res = await fetch('/api/admin/reset-seed', { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'Đã nạp thêm dữ liệu mẫu!');
        fetchOverview();
        if (currentTable) loadTableData(currentTable);
      } catch (err) {
        alert('Lỗi: ' + err.message);
      } finally {
        btn.textContent = '🌱 Nạp Dữ Liệu Mẫu';
      }
    }

    // Test API Endpoint
    async function testEndpoint(endpoint) {
      const output = document.getElementById('api-output');
      const statusEl = document.getElementById('api-status');
      const timeEl = document.getElementById('api-time');

      output.textContent = 'Đang gọi ' + endpoint + '...';
      const t0 = performance.now();

      try {
        const res = await fetch(endpoint);
        const t1 = performance.now();
        const json = await res.json();

        statusEl.textContent = \`HTTP \${res.status} \${res.statusText}\`;
        statusEl.style.color = res.ok ? '#34d399' : '#f43f5e';
        timeEl.textContent = Math.round(t1 - t0) + ' ms';
        output.textContent = JSON.stringify(json, null, 2);
      } catch (err) {
        statusEl.textContent = 'LỖI KẾT NỐI';
        statusEl.style.color = '#f43f5e';
        output.textContent = 'Error: ' + err.message;
      }
    }

    // WebSocket Live Monitor Setup
    function setupWebSocketMonitor() {
      try {
        const socket = io();
        const log = document.getElementById('ws-log');

        function appendLog(msg) {
          const time = new Date().toLocaleTimeString('vi-VN');
          log.textContent = \`[\${time}] \${msg}\\n\` + log.textContent;
        }

        socket.on('connect', () => {
          document.getElementById('ws-status').textContent = '● Đã kết nối thành công';
          document.getElementById('ws-status').style.color = '#34d399';
          document.getElementById('ws-socket-id').textContent = socket.id;
          appendLog('Kết nối Socket.io thành công với ID: ' + socket.id);
        });

        socket.on('disconnect', () => {
          document.getElementById('ws-status').textContent = '● Đã ngắt kết nối';
          document.getElementById('ws-status').style.color = '#f43f5e';
          appendLog('Mất kết nối với server.');
        });

        socket.on('question_started', (data) => {
          appendLog('▶️ SỰ KIỆN: Câu hỏi mới bắt đầu (Thứ tự: ' + data.questionOrder + ')');
        });

        socket.on('update_submitted_students', (data) => {
          appendLog('📥 SỰ KIỆN: Học sinh vừa nộp bài. Đã nộp: ' + data.submittedCardIds.length + '/' + data.totalStudents);
        });

        socket.on('question_locked', (data) => {
          appendLog('🔒 SỰ KIỆN: Khóa câu hỏi. Đáp án đúng: ' + data.correctOption);
        });
      } catch (err) {
        console.warn('Socket monitor init:', err);
      }
    }

    // Init on page load
    window.onload = () => {
      fetchOverview();
      setupWebSocketMonitor();
      setInterval(fetchOverview, 10000); // Tự động làm mới mỗi 10 giây
    };
  </script>
</body>
</html>
`;
}
