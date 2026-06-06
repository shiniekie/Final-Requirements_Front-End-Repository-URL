// Prevent multiple execution
if (typeof window.initDashboardPageInitialized === "undefined") {
  window.initDashboardPageInitialized = true;
  window.allOrders = [];

  if (typeof userInfo !== "undefined" && userInfo.user) {
    $("#_customerName").html(userInfo.user.name);
  }

  function loadOrders() {
    $.ajax({
      url: `${BASE_URL}/customer_order_history`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        window.allOrders = res;
        renderDashboardOrders();
        renderOrderUpdates();
      },
      error: function (xhr) {
        console.log(xhr.status, xhr.responseText);
        $("#dash-orders-table").html(`
          <tr>
            <td colspan="5" class="text-center py-5 text-danger">
              Failed to load orders. Please try again.
            </td>
          </tr>
        `);
        $("#order-updates").html(`
          <div class="text-center py-5 text-danger">
            Failed to load order updates
          </div>
        `);
      },
    });
  }

  // Render recent orders for dashboard (limit to 5)
  function renderDashboardOrders() {
    if (!window.allOrders || window.allOrders.length === 0) {
      $("#dash-orders-table").html(`
        <tr>
          <td colspan="5" class="text-center py-5">
            No orders found
          </td>
        </tr>
      `);
      return;
    }

    // Get only the 5 most recent orders
    const recentOrders = [...window.allOrders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    function getStatusBadgeClass(status) {
      const statusMap = {
        pending: "badge-pending",
        processing: "badge-processing",
        paid: "badge-paid",
        shipped: "badge-shipped",
        delivered: "badge-delivered",
        cancelled: "badge-cancelled",
      };
      return statusMap[status] || "badge-pending";
    }

    function getProductNames(order) {
      if (order.items && order.items.length > 0) {
        const productNames = order.items
          .map((item) => item.product?.name || "Product")
          .slice(0, 2);
        if (order.items.length > 2) {
          return productNames.join(", ") + ` +${order.items.length - 2} more`;
        }
        return productNames.join(", ");
      }
      return "N/A";
    }

    $("#dash-orders-table").html(
      recentOrders
        .map(
          (order) => `
        <tr onclick="viewOrderDetails(${order.id})" style="cursor: pointer;">
          <td>${escapeHtml(order.orderNumber || order.order_number || order.id)}</td>
          <td>${getProductNames(order)}</td>
          <td>₱${parseFloat(order.total).toFixed(2)}</td>
          <td><span class="badge-pill ${getStatusBadgeClass(order.status)}">${escapeHtml(order.status)}</span></td>
          <td>${new Date(order.created_at).toLocaleDateString()}</td>
        </tr>
      `,
        )
        .join(""),
    );
  }

  // Render order status updates/timeline
  function renderOrderUpdates() {
    if (!window.allOrders || window.allOrders.length === 0) {
      $("#order-updates").html(`
        <div class="text-center py-4">
          <i class="bi bi-inbox" style="font-size: 48px; color: #cbd5e1;"></i>
          <p class="mt-2 text-muted">No recent order updates</p>
        </div>
      `);
      return;
    }

    // Get orders that are not delivered or cancelled (active orders)
    const activeOrders = window.allOrders
      .filter(
        (order) => order.status !== "delivered" && order.status !== "cancelled",
      )
      .slice(0, 3);

    if (activeOrders.length === 0) {
      $("#order-updates").html(`
        <div class="text-center py-4">
          <i class="bi bi-check-circle" style="font-size: 48px; color: #10b981;"></i>
          <p class="mt-2 text-muted">All caught up! No pending orders.</p>
        </div>
      `);
      return;
    }

    const getStatusIcon = (status) => {
      const icons = {
        pending: "bi-clock-history",
        processing: "bi-arrow-repeat",
        paid: "bi-credit-card",
        shipped: "bi-truck",
        delivered: "bi-check-circle",
        cancelled: "bi-x-circle",
      };
      return icons[status] || "bi-question-circle";
    };

    const getStatusColor = (status) => {
      const colors = {
        pending: "#d97706",
        processing: "#0284c7",
        paid: "#059669",
        shipped: "#7c3aed",
        delivered: "#10b981",
        cancelled: "#dc2626",
      };
      return colors[status] || "#64748b";
    };

    $("#order-updates").html(
      activeOrders
        .map(
          (order) => `
        <div class="update-item" onclick="viewOrderDetails(${order.id})" style="cursor: pointer;">
          <div class="update-icon" style="color: ${getStatusColor(order.status)};">
            <i class="bi ${getStatusIcon(order.status)}"></i>
          </div>
          <div class="update-content">
            <div class="update-title">
              <strong>Order #${escapeHtml(order.orderNumber || order.order_number || order.id)}</strong>
              <span class="badge-pill ${getStatusBadgeClass(order.status)}" style="margin-left: 8px;">${escapeHtml(order.status)}</span>
            </div>
            <div class="update-message">
              Your order has been ${order.status}
              ${order.status === "shipped" ? "and is on its way!" : ""}
              ${order.status === "processing" ? "and is being prepared." : ""}
              ${order.status === "paid" ? "Payment confirmed. Order will be processed soon." : ""}
            </div>
          </div>
        </div>
      `,
        )
        .join(""),
    );
  }

  function getStatusBadgeClass(status) {
    const statusMap = {
      pending: "badge-pending",
      processing: "badge-processing",
      paid: "badge-paid",
      shipped: "badge-shipped",
      delivered: "badge-delivered",
      cancelled: "badge-cancelled",
    };
    return statusMap[status] || "badge-pending";
  }

  function escapeHtml(str) {
    return String(str || "").replace(
      /[&<>]/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
        })[m],
    );
  }

  // INIT FUNCTION
  window.initDashboardPage = function () {
    loadOrders();
  };
}
