// admin-users.js - Prevent multiple execution
if (typeof window.adminUsersInitialized === "undefined") {
  window.adminUsersInitialized = true;

  let allUsers = [];
  let currentPage = 1;
  let totalPages = 1;
  let itemsPerPage = 10;

  // ======================== LOAD USERS ========================
  function loadUsers() {
    $("#usersTableBody").html(`
      <tr>
        <td colspan="5" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Loading users...</p>
        </td>
      </tr>
    `);

    $.ajax({
      url: `${BASE_URL}/users`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        console.log("Users response:", res);
        const users = res.data || res || [];
        allUsers = users;
        renderUsers();
      },
      error: function (xhr) {
        console.error("Failed to load users:", xhr);
        $("#usersTableBody").html(`
          <tr>
            <td colspan="5" class="text-center text-danger py-5">
              <i class="bi bi-exclamation-triangle" style="font-size: 48px;"></i>
              <p class="mt-2">Failed to load users. Please try again.</p>
              <button class="btn-primary-app btn-sm" onclick="window.reloadUsers()">Retry</button>
            </td>
          </tr>
        `);
      },
    });
  }

  function renderUsers() {
    // Get filter values
    const searchTerm = $("#userSearch").val()?.toLowerCase();
    const roleFilter = $("#roleFilter").val();

    // Apply filters
    let filteredUsers = [...allUsers];

    if (searchTerm) {
      filteredUsers = filteredUsers.filter(
        (user) =>
          (user.name && user.name.toLowerCase().includes(searchTerm)) ||
          (user.email && user.email.toLowerCase().includes(searchTerm)) ||
          (user.phone && user.phone.toLowerCase().includes(searchTerm)),
      );
    }

    if (roleFilter) {
      filteredUsers = filteredUsers.filter((user) => user.role === roleFilter);
    }

    // Calculate pagination
    const totalUsers = filteredUsers.length;
    totalPages = Math.ceil(totalUsers / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedUsers = filteredUsers.slice(start, start + itemsPerPage);

    // Render table
    renderUsersTable(paginatedUsers);
    renderPagination();
  }

  function renderUsersTable(users) {
    if (!users || users.length === 0) {
      $("#usersTableBody").html(`
        <tr>
          <td colspan="5" class="text-center py-5">
            <i class="bi bi-people" style="font-size: 48px; color: #cbd5e1;"></i>
            <p class="mt-2 text-muted">No users found</p>
          </td>
        </tr>
      `);
      return;
    }

    $("#usersTableBody").html(
      users
        .map(
          (user) => `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="user-avatar ${user.role}">
                ${getUserAvatarHtml(user)}
              </div>
              <div>
                <div style="font-weight: 600;">${escapeHtml(user.name || "N/A")}</div>
                <div style="font-size: 11px; color: #64748b;">${escapeHtml(user.phone || "No phone")}</div>
              </div>
            </div>
           </td>
          <td>${escapeHtml(user.email)}</td>
          <td>
            <span class="role-badge role-${user.role}">
              <i class="bi ${getRoleIcon(user.role)}"></i> ${user.role || "Customer"}
            </span>
          </td>
          <td>
            <span class="status-badge status-${user.status?.toLowerCase() || "active"}">
              ${user.status || "Active"}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn-icon" onclick="window.viewUser(${user.id})" title="View Details">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn-icon" onclick="window.editUser(${user.id})" title="Edit User">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn-icon" onclick="window.deleteUser(${user.id})" title="${user.id == 3 ? "You can't delete this user" : "You can delete this user"}" ${user.id == 3 ? "disabled" : ""}>
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `,
        )
        .join(""),
    );
  }

  function renderPagination() {
    if (totalPages <= 1) {
      $("#usersPagination").html("");
      return;
    }

    let pagesHtml = `<div class="pagination-controls">`;
    pagesHtml += `<button class="pagination-btn" onclick="window.goToPage(1)" ${currentPage === 1 ? "disabled" : ""}>First</button>`;
    pagesHtml += `<button class="pagination-btn" onclick="window.goToPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>Prev</button>`;
    pagesHtml += `<span class="pagination-info">Page ${currentPage} of ${totalPages}</span>`;
    pagesHtml += `<button class="pagination-btn" onclick="window.goToPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;
    pagesHtml += `<button class="pagination-btn" onclick="window.goToPage(${totalPages})" ${currentPage === totalPages ? "disabled" : ""}>Last</button>`;
    pagesHtml += `</div>`;

    $("#usersPagination").html(pagesHtml);
  }

  window.goToPage = function (page) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page;
      renderUsers();
    }
  };

  window.reloadUsers = function () {
    currentPage = 1;
    loadUsers();
  };

  // ======================== USER CRUD OPERATIONS ========================
  window.openUserModal = function () {
    Swal.fire({
      title: "Add New Admin",
      html: `
        <div style="text-align: left;">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="userName" class="form-ctrl" placeholder="Enter full name">
          </div>
          <div class="form-group">
            <label>Email Address *</label>
            <input type="email" id="userEmail" class="form-ctrl" placeholder="Enter email address">
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="userPhone" class="form-ctrl" placeholder="Enter phone number">
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea id="userAddress" class="form-ctrl" rows="2" placeholder="Enter address"></textarea>
          </div>
          <div class="form-group">
            <label>Password *</label>
            <input type="password" id="userPassword" class="form-ctrl" placeholder="Enter password">
          </div>
          <div class="form-group">
            <label>Confirm Password *</label>
            <input type="password" id="userConfirmPassword" class="form-ctrl" placeholder="Confirm password">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Create User",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3b82f6",
      preConfirm: () => {
        const name = document.getElementById("userName").value;
        const email = document.getElementById("userEmail").value;
        const password = document.getElementById("userPassword").value;
        const confirmPassword = document.getElementById(
          "userConfirmPassword",
        ).value;

        if (!name || !email || !password) {
          Swal.showValidationMessage("Please fill all required fields (*)");
          return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Swal.showValidationMessage("Please enter a valid email address");
          return false;
        }

        if (password.length < 6) {
          Swal.showValidationMessage("Password must be at least 6 characters");
          return false;
        }

        if (password !== confirmPassword) {
          Swal.showValidationMessage("Passwords do not match");
          return false;
        }

        return {
          name: name,
          email: email,
          phone: document.getElementById("userPhone").value,
          address: document.getElementById("userAddress").value,
          role: "admin",
          password: password,
        };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        createUser(result.value);
      }
    });
  };

  function createUser(userData) {
    Swal.fire({
      title: "Creating User...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    $.ajax({
      url: `${BASE_URL}/users`,
      type: "POST",
      headers: getHeaders(),
      data: JSON.stringify(userData),
      contentType: "application/json",
      success: function (res) {
        console.log(res);
        Swal.fire({
          title: "Success!",
          text: "User created successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        loadUsers();
      },
      error: function (xhr) {
        let errorMsg = "Failed to create user";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMsg = xhr.responseJSON.message;
        }
        Swal.fire("Error", errorMsg, "error");
      },
    });
  }

  window.viewUser = function (userId) {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) {
      Swal.fire("Error", "User not found", "error");
      return;
    }

    Swal.fire({
      title: "User Details",
      html: `
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <div style="display: flex; align-items: center; gap: 15px;">
              <div class="user-avatar-large ${user.role}">
                ${getUserAvatarHtml(user)}
              </div>
              <div>
                <div style="font-size: 18px; font-weight: bold;">${escapeHtml(user.name)}</div>
                <div style="font-size: 12px; opacity: 0.9;">${user.role || "Customer"}</div>
              </div>
            </div>
          </div>
          
          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${escapeHtml(user.email)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${escapeHtml(user.phone || "N/A")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Address:</div>
            <div class="detail-value">${escapeHtml(user.address || "N/A")}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
              <span class="status-badge status-${user.status?.toLowerCase() || "active"}">${user.status || "Active"}</span>
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Joined:</div>
            <div class="detail-value">${formatDate(user.created_at)}</div>
          </div>
        </div>
      `,
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
      width: "500px",
    });
  };

  window.editUser = function (userId) {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) {
      Swal.fire("Error", "User not found", "error");
      return;
    }

    Swal.fire({
      title: "Edit User Role",
      html: `
        <div style="text-align: left;">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="editUserName" class="form-ctrl" value="${escapeHtml(user.name)}" readonly>
          </div>
          <div class="form-group">
            <label>Email Address *</label>
            <input type="email" id="editUserEmail" class="form-ctrl" value="${escapeHtml(user.email)}" readonly>
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input type="tel" id="editUserPhone" class="form-ctrl" value="${escapeHtml(user.phone || "")}" readonly>
          </div>
          <div class="form-group">
            <label>Delivery Address</label>
            <textarea id="editUserAddress" class="form-ctrl" rows="2" readonly>${escapeHtml(user.address || "")}</textarea>
          </div>
          <div class="form-group">
            <label>Role *</label>
            <select id="editUserRole" class="form-ctrl">
              <option value="customer" ${user.role === "customer" ? "selected" : ""}>Customer</option>
              <option value="seller" ${user.role === "seller" ? "selected" : ""}>Seller</option>
              <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Save Changes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3b82f6",
      preConfirm: () => {
        const name = document.getElementById("editUserName").value;
        const email = document.getElementById("editUserEmail").value;

        if (!name || !email) {
          Swal.showValidationMessage("Name and email are required");
          return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Swal.showValidationMessage("Please enter a valid email address");
          return false;
        }

        return {
          name: name,
          email: email,
          phone: document.getElementById("editUserPhone").value,
          address: document.getElementById("editUserAddress").value,
          role: document.getElementById("editUserRole").value,
        };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        updateUser(userId, result.value);
      }
    });
  };

  function updateUser(userId, userData) {
    Swal.fire({
      title: "Updating User...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    userData.user_id = userId;

    $.ajax({
      url: `${BASE_URL}/users/role`,
      type: "POST",
      headers: getHeaders(),
      data: JSON.stringify(userData),
      contentType: "application/json",
      success: function (res) {
        Swal.fire({
          title: "Success!",
          text: "User updated successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
        loadUsers();
      },
      error: function (xhr) {
        let errorMsg = "Failed to update user";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMsg = xhr.responseJSON.message;
        }
        Swal.fire("Error", errorMsg, "error");
      },
    });
  }

  window.deleteUser = function (userId) {
    const user = allUsers.find((u) => u.id === userId);

    Swal.fire({
      title: "Delete User?",
      html: `Are you sure you want to delete <strong>${escapeHtml(user?.name)}</strong>?<br>This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Deleting...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });

        $.ajax({
          url: `${BASE_URL}/users/${userId}`,
          type: "DELETE",
          headers: getHeaders(),
          success: function (res) {
            Swal.fire({
              title: "Deleted!",
              text: "User has been removed",
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
            loadUsers();
          },
          error: function (xhr) {
            let errorMsg = "Failed to delete user";
            if (xhr.responseJSON && xhr.responseJSON.message) {
              errorMsg = xhr.responseJSON.message;
            }
            Swal.fire("Error", errorMsg, "error");
          },
        });
      }
    });
  };

  // ======================== HELPER FUNCTIONS ========================
  function getAvatarInitials(name) {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function getInitialsOnly(name, gradient) {
    const initials = getAvatarInitials(name);
    return `<div class="user-avatar user-avatar-initials" style="background: ${gradient};">${initials}</div>`;
  }

  function getUserAvatarHtml(user) {
    const photoUrl = user.photo_url || user.photo;
    const initials = getAvatarInitials(user.name);

    // Role-based gradient colors for fallback
    const roleColors = {
      admin: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      seller: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      customer: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      default: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    };

    const gradient = roleColors[user.role] || roleColors.default;

    if (photoUrl && photoUrl !== "null" && photoUrl !== "") {
      return `
        <div class="user-avatar user-avatar-image ${user.role}">
          <img src="${photoUrl}" alt="${escapeHtml(user.name)}" />
        </div>
      `;
    } else {
      return `
        <div class="user-avatar user-avatar-initials ${user.role}" style="background: ${gradient};">
          ${initials}
        </div>
      `;
    }
  }

  function getRoleIcon(role) {
    switch (role) {
      case "admin":
        return "bi-shield-lock-fill";
      case "seller":
        return "bi-shop";
      default:
        return "bi-person";
    }
  }

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

  // ======================== EXPORT FUNCTION ========================
  window.exportUsers = function () {
    if (allUsers.length === 0) {
      Swal.fire("Error", "No data to export", "error");
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Role",
      "Status",
      "Address",
      "Joined Date",
    ];
    const rows = allUsers.map((user) => [
      user.name,
      user.email,
      user.phone || "",
      user.role,
      user.status,
      user.address || "",
      formatDate(user.created_at),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Swal.fire("Success", "Users exported successfully!", "success");
  };

  // ======================== INIT FUNCTION ========================
  window.initAdminUsers = function (forceReload = false) {
    if (forceReload) {
      allUsers = [];
      currentPage = 1;
    }
    loadUsers();
    console.log * allUsers;
  };
}
