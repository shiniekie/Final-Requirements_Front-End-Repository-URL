// customer-notifications.js - Notification system for customer
if (typeof window.notificationsInitialized === "undefined") {
  window.notificationsInitialized = true;

  let notifications = [];
  let unreadCount = 0;

  // Load notifications from API
  function loadNotifications() {
    if (typeof BASE_URL !== "undefined" && getHeaders) {
      $.ajax({
        url: `${BASE_URL}/notifications`,
        type: "GET",
        headers: getHeaders(),
        success: function (res) {
          console.log(res);
          const data = res.data || res || [];
          notifications = data;
          updateUnreadCount();
          renderNotifications();
        },
        error: function (xhr, err) {
          console.log("Failed to load notifications from API:", err);
          renderNotifications(); // Show empty state
        },
      });
    } else {
      renderNotifications(); // Show empty state
    }
  }

  // Update unread count badge
  function updateUnreadCount() {
    unreadCount = notifications.filter((n) => n.status === 0).length;

    const notifDot = document.getElementById("notifDot");
    if (notifDot) {
      if (unreadCount > 0) {
        notifDot.style.display = "flex";
        notifDot.textContent = unreadCount > 9 ? "9+" : unreadCount;
      } else {
        notifDot.style.display = "none";
      }
    }
  }

  // Mark a single notification as read
  function markAsRead(notificationId) {
    const notif = notifications.find((n) => n.id === notificationId);

    if (notif && notif.status === 0) {
      notif.status = 1;
      updateUnreadCount();
      renderNotifications();

      $.ajax({
        url: `${BASE_URL}/notifications/${notificationId}`,
        type: "PUT",
        headers: getHeaders(),
        contentType: "application/json",
        success: function () {
          updateUnreadCount();
          renderNotifications();
        },
        error: function (xhr) {
          console.error("Failed to mark notification as read:", xhr);
          notif.status = 0;
          updateUnreadCount();
          renderNotifications();
        },
      });
    }
  }

  // Mark all as read
  window.markAllRead = function () {
    notifications.forEach((n) => (n.status = 1));
    updateUnreadCount();
    renderNotifications();

    $.ajax({
      url: `${BASE_URL}/notifications/read-all`,
      type: "PATCH",
      headers: getHeaders(),
      contentType: "application/json",
      success: function () {
        updateUnreadCount();
        renderNotifications();
      },

      error: function (xhr) {
        console.error("Failed to mark all as read:", xhr);
        loadNotifications();
      },
    });
  };

  // Clear all notifications
  window.clearAllNotifications = function () {
    if (notifications.length === 0) return;

    Swal.fire({
      title: "Clear all notifications?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, clear all",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    }).then((result) => {
      if (result.isConfirmed) {
        // Update UI immediately
        notifications = [];
        updateUnreadCount();
        renderNotifications();

        // Call API to clear all
        $.ajax({
          url: `${BASE_URL}/notifications/clear-all`,
          type: "DELETE",
          headers: getHeaders(),
          error: function (xhr) {
            console.error("Failed to clear notifications:", xhr);
            // Revert on error - reload from API
            loadNotifications();
          },
        });

        Swal.fire({
          title: "Cleared!",
          text: "All notifications have been cleared.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  };

  // Get icon based on notification type
  function getNotificationIcon(type) {
    const icons = {
      order: "bi-truck",
      promotion: "bi-tag",
      system: "bi-gear",
      info: "bi-info-circle",
      success: "bi-check-circle",
      warning: "bi-exclamation-triangle",
    };
    return icons[type] || "bi-bell";
  }

  // Get color based on notification type
  function getNotificationColor(type) {
    const colors = {
      order: "#3b82f6",
      promotion: "#f59e0b",
      system: "#8b5cf6",
      info: "#64748b",
      success: "#10b981",
      warning: "#f59e0b",
    };
    return colors[type] || "#3b82f6";
  }

  // Render notifications to the panel
  window.renderNotifications = function () {
    const container = document.getElementById("notifList");
    if (!container) return;

    if (notifications.length === 0) {
      container.innerHTML = `
        <div class="notif-empty">
          <i class="bi bi-bell-slash"></i>
          <p>No notifications yet</p>
          <span style="font-size: 12px; color: #94a3b8;">We'll notify you when something arrives</span>
        </div>
      `;
      return;
    }

    // Sort by date (newest first)
    const sortedNotifs = [...notifications].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    container.innerHTML = sortedNotifs
      .map((notif) => {
        const icon = notif.icon || getNotificationIcon(notif.type);
        const color = notif.color || getNotificationColor(notif.type);

        return `
            <div class="notif-item ${notif.status === 0 ? "unread" : ""}" 
                 data-id="${notif.id}"
                 onclick="handleNotificationClick(${notif.id})">
              <div class="notif-icon" style="background: ${color}20; color: ${color};">
                <i class="bi ${icon}"></i>
              </div>
              <div class="notif-content">
                <div class="notif-title">${escapeHtml(notif.title)}</div>
                <div class="notif-message">${escapeHtml(notif.message)}</div>
                <div class="notif-time">
                  <i class="bi bi-clock"></i> ${timeAgo(parseUTCDate(notif.created_at))}
                </div>
              </div>
              <div class="notif-actions">
                <button class="notif-delete" onclick="event.stopPropagation(); markAsRead(${notif.id})" title="Delete">
                  <i class="bi bi-x-circle"></i>
                </button>
              </div>
            </div>
          `;
      })
      .join("");
  };

  // Handle notification click
  window.handleNotificationClick = function (notificationId) {
    const notif = notifications.find((n) => n.id === notificationId);
    console.log(notif);
    if (notif) {
      if (notif.status === "unread") {
        markAsRead(notificationId);
      }

      // Close panel
      const panel = document.getElementById("notifPanel");
      if (panel) panel.classList.remove("show");

      // Navigate if link exists
      if (notif.link && typeof navigate === "function") {
        navigate(notif.link);
      }
    }
  };

  // Toggle notification panel
  window.toggleNotifPanel = function () {
    const panel = document.getElementById("notifPanel");
    if (panel) {
      panel.classList.toggle("show");
    }
  };

  // Close panel when clicking outside
  $(document).on("click", function (event) {
    const panel = document.getElementById("notifPanel");
    const notifBtn = document.querySelector(".notif-btn");

    if (
      panel &&
      panel.classList.contains("show") &&
      !panel.contains(event.target) &&
      notifBtn &&
      !notifBtn.contains(event.target)
    ) {
      panel.classList.remove("show");
    }
  });

  // Add a new notification (called from other parts of the app)
  window.addNotification = function (
    title,
    message,
    type = "info",
    link = null,
  ) {
    const newNotification = {
      id: Date.now(),
      title: title,
      message: message,
      type: type,
      status: "unread",
      created_at: new Date().toISOString(),
      link: link,
    };

    notifications.unshift(newNotification);
    updateUnreadCount();
    renderNotifications();

    // Optionally save to API
    if (typeof BASE_URL !== "undefined" && getHeaders) {
      $.ajax({
        url: `${BASE_URL}/notifications`,
        type: "POST",
        headers: getHeaders(),
        data: JSON.stringify({
          title: title,
          message: message,
          type: type,
          link: link,
        }),
        contentType: "application/json",
        error: function (xhr) {
          console.error("Failed to save notification to server:", xhr);
        },
      });
    }
  };

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  }

  // Expose functions globally
  window.markAsRead = markAsRead;
  window.clearAllNotifications = clearAllNotifications;

  // INIT FUNCTION
  window.initNotifications = function () {
    loadNotifications();
  };
}
