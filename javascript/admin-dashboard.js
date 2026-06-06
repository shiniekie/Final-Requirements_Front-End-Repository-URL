// admin-dashboard.js - Prevent multiple execution
if (typeof window.adminDashboardInitialized === "undefined") {
  window.adminDashboardInitialized = true;

  let adminUsersList = [];
  let allUsersList = [];
  let recentUsersList = [];
  let statsData = {
    totalUsers: 0,
    totalCustomers: 0,
    totalSellers: 0,
    totalAdmins: 0,
  };

  // ======================== LOAD DASHBOARD DATA ========================
  function loadAdminDashboard() {
    loadUsersStats();
    loadRecentUsers();
    loadAdminUsers();
  }

  function loadUsersStats() {
    $.ajax({
      url: `${BASE_URL}/users`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        console.log("Users response:", res);

        const users = Array.isArray(res) ? res : res.data || [];
        allUsersList = users;

        // Count users by role
        statsData.totalUsers = users.length;
        statsData.totalCustomers = users.filter(
          (u) => u.role === "customer" || u.role === "user",
        ).length;
        statsData.totalSellers = users.filter(
          (u) => u.role === "seller",
        ).length;
        statsData.totalAdmins = users.filter((u) => u.role === "admin").length;

        // Update stats cards
        $("#dash-users").text(statsData.totalUsers);
        $("#dash-customer").text(statsData.totalCustomers);
        $("#dash-seller").text(statsData.totalSellers);
        $("#dash-admin").text(statsData.totalAdmins);
      },
      error: function (xhr) {
        console.error("Failed to load users:", xhr);
        // Fallback to mock data
        loadMockUsersData();
      },
    });
  }

  function loadMockUsersData() {
    // Mock data for fallback
    statsData = {
      totalUsers: 1248,
      totalCustomers: 892,
      totalSellers: 312,
      totalAdmins: 44,
    };

    $("#dash-users").text(statsData.totalUsers);
    $("#dash-customer").text(statsData.totalCustomers);
    $("#dash-seller").text(statsData.totalSellers);
    $("#dash-admin").text(statsData.totalAdmins);
  }

  function loadRecentUsers() {
    $.ajax({
      url: `${BASE_URL}/users/recent`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        console.log("Recent users response:", res);
        const users = Array.isArray(res) ? res : res.data || [];
        renderRecentUsers(users.slice(0, 5));
      },
      error: function (xhr) {
        console.error("Failed to load recent users:", xhr);
        // Use fallback from all users
        if (allUsersList.length > 0) {
          renderRecentUsers(allUsersList.slice(0, 5));
        }
      },
    });
  }

  function renderRecentUsers(users) {
    if (!users || users.length === 0) {
      $("#dash-users-table").html(`
        <tr>
          <td colspan="4" class="text-center py-4">
            <i class="bi bi-person-x" style="font-size: 32px; color: #cbd5e1;"></i>
            <p class="mt-2 text-muted">No users found</p>
          </td>
        </tr>
      `);
      return;
    }

    $("#dash-users-table").html(
      users
        .map(
          (user) => `
        <tr>
          <td>
            <span style="font-family: monospace; font-size: 12px; font-weight: 600;">
              #${user.id}
            </span>
            <div style="font-size: 12px; color: #64748b;">${escapeHtml(user.email || "")}</div>
          </td>
          <td>
            <span class="role-badge role-${user.role || "customer"}">
              ${user.role || "Customer"}
            </span>
          </td>
          <td>${formatDate(user.created_at)}</td>
          <td>
            <span class="status-badge status-${user.status || "active"}">
              ${user.status || "Active"}
            </span>
          </td>
        </tr>
      `,
        )
        .join(""),
    );
  }

  function loadAdminUsers() {
    $.ajax({
      url: `${BASE_URL}/users/admins`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        console.log("Admin users response:", res);
        const admins = Array.isArray(res) ? res : res.data || [];
        renderAdminUsers(admins);
      },
      error: function (xhr) {
        console.error("Failed to load admin users:", xhr);
        // Filter from all users
        if (allUsersList.length > 0) {
          const admins = allUsersList.filter((u) => u.role === "admin");
          renderAdminUsers(admins);
        }
      },
    });
  }

  function renderAdminUsers(admins) {
    const container = $("#admin-users-list");

    if (!admins || admins.length === 0) {
      container.html(`
        <div class="text-center py-4">
          <i class="bi bi-shield-slash" style="font-size: 32px; color: #cbd5e1;"></i>
          <p class="mt-2 text-muted">No admin users found</p>
        </div>
      `);
      return;
    }

    container.html(
      admins
        .map(
          (admin) => `
        <div class="admin-user-item">
          <div class="admin-info">
            <div class="admin-name">${escapeHtml(admin.name || admin.username || "Admin User")}</div>
            <div class="admin-email">${escapeHtml(admin.email || "")}</div>
          </div>
          <div class="admin-status">
            <span class="status-badge status-active">Active</span>
          </div>
        </div>
      `,
        )
        .join(""),
    );
  }

  window.viewUserDetails = function (userId) {
    const user = allUsersList.find((u) => u.id === userId);
    if (!user) {
      Swal.fire("Error", "User not found", "error");
      return;
    }

    Swal.fire({
      title: `User Details: ${user.name || user.username}`,
      html: `
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 15px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">
                ${user.role === "admin" ? "👑" : user.role === "seller" ? "🏪" : "👤"}
              </div>
              <div>
                <div style="font-size: 18px; font-weight: bold;">${escapeHtml(user.name || user.username)}</div>
                <div style="font-size: 12px; opacity: 0.9;">${escapeHtml(user.role || "Customer")}</div>
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
            <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
              <div style="font-size: 11px; color: #64748b;">Email</div>
              <div style="font-size: 13px; font-weight: 500;">${escapeHtml(user.email || "N/A")}</div>
            </div>
            <div style="background: #f8fafc; padding: 10px; border-radius: 8px;">
              <div style="font-size: 11px; color: #64748b;">Phone</div>
              <div style="font-size: 13px; font-weight: 500;">${escapeHtml(user.phone || "N/A")}</div>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
            <div style="font-size: 11px; color: #64748b;">Address</div>
            <div style="font-size: 13px;">${escapeHtml(user.address || "No address provided")}</div>
          </div>
          
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b;">
            <span>Joined: ${formatDate(user.created_at)}</span>
            <span>ID: #${user.id}</span>
          </div>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
      width: "500px",
    });
  };

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  }

  // Export data function
  window.exportUsersReport = function () {
    if (allUsersList.length === 0) {
      Swal.fire("Error", "No data to export", "error");
      return;
    }

    const headers = [
      "User ID",
      "Name",
      "Email",
      "Role",
      "Status",
      "Joined Date",
    ];
    const rows = allUsersList.map((user) => [
      user.id,
      user.name || user.username,
      user.email,
      user.role || "customer",
      user.status || "active",
      formatDate(user.created_at),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Swal.fire("Success", "Users report exported successfully!", "success");
  };

  // Auto-refresh dashboard every 60 seconds
  let refreshInterval = null;

  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      loadUsersStats();
      loadRecentUsers();
      loadAdminUsers();
    }, 60000); // Refresh every 60 seconds
  }

  function stopAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  }

  // INIT FUNCTION
  window.initAdminDashboard = function (forceReload = false) {
    if (forceReload) {
      allUsersList = [];
      adminUsersList = [];
    }
    loadAdminDashboard();
    startAutoRefresh();
  };

  // Cleanup function for when page changes
  window.cleanupAdminDashboard = function () {
    stopAutoRefresh();
  };
}
