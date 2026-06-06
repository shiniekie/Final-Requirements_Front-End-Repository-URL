// seller-orders.js - Prevent multiple execution
if (typeof window.sellerOrdersInitialized === "undefined") {
  window.sellerOrdersInitialized = true;

  let sellerOrdersList = [];
  let sellerOrdersPage = 1;
  let sellerOrdersTotalPages = 1;
  let sellerOrdersPerPage = 10;
  let allOrders = [];

  // ======================== LOAD ORDERS ========================
  function loadSellerOrders(page = 1) {
    $("#sellerOrdersTableBody").html(`
      <tr>
        <td colspan="7" class="text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="mt-2">Loading orders...</p>
        </td>
      </tr>
    `);

    $.ajax({
      url: `${BASE_URL}/customer_orders`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        const orders = Array.isArray(res) ? res : res.data || res.orders || [];
        sellerOrdersList = [];
        allOrders = orders;

        // Process orders and flatten items
        orders.forEach((order) => {
          (order.items || []).forEach((item) => {
            sellerOrdersList.push({
              order_id: order.orderNumber || order.order_number || order.id,
              order_number: order.orderNumber || order.order_number || order.id,
              product_id: item.product?.id || item.product_id,
              product_name: item.product?.name || "Unknown Product",
              product_price: item.product?.price || 0,
              quantity: item.quantity || 1,
              revenue:
                parseFloat(item.product?.price || 0) * (item.quantity || 1),
              total_amount: parseFloat(order.total) || 0,
              status: order.status,
              date: order.created_at,
              customer_name: order.customer?.name || "Guest",
              customer_email: order.customer?.email || "",
              order_subtotal: parseFloat(order.subtotal) || 0,
              order_vat: parseFloat(order.vat) || 0,
              order_shipping: parseFloat(order.shipping) || 0,
            });
          });
        });

        applyFiltersAndPagination(page);
      },
      error: function (xhr) {
        console.error("Failed to fetch orders:", xhr);
        $("#sellerOrdersTableBody").html(`
          <tr>
            <td colspan="7" class="text-center text-danger py-5">
              <i class="bi bi-exclamation-triangle" style="font-size: 48px;"></i>
              <p class="mt-2">Failed to load orders. Please try again.</p>
              <button class="btn-primary-app btn-sm" onclick="window.reloadSellerOrders()">Retry</button>
            </td>
          </tr>
        `);
      },
    });
  }

  function applyFiltersAndPagination(page = 1) {
    // Get filter values
    const searchTerm = $("#sellerOrderSearch").val()?.toLowerCase();
    const statusFilter = $("#sellerOrderStatusFilter").val();

    // Apply filters
    let filteredOrders = [...sellerOrdersList];

    if (searchTerm) {
      filteredOrders = filteredOrders.filter(
        (order) =>
          order.order_id.toLowerCase().includes(searchTerm) ||
          order.product_name.toLowerCase().includes(searchTerm) ||
          order.customer_name.toLowerCase().includes(searchTerm),
      );
    }

    if (statusFilter) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === statusFilter,
      );
    }

    // Calculate pagination
    const totalOrders = filteredOrders.length;
    sellerOrdersTotalPages = Math.ceil(totalOrders / sellerOrdersPerPage);
    sellerOrdersPage = Math.min(page, sellerOrdersTotalPages || 1);

    const start = (sellerOrdersPage - 1) * sellerOrdersPerPage;
    const paginatedOrders = filteredOrders.slice(
      start,
      start + sellerOrdersPerPage,
    );

    // Render table and pagination
    renderSellerOrdersTable(paginatedOrders);
    renderSellerOrdersPagination();
  }

  function renderSellerOrdersTable(orders) {
    if (!orders || orders.length === 0) {
      $("#sellerOrdersTableBody").html(`
        <tr>
          <td colspan="7" class="text-center py-5">
            <i class="bi bi-inbox" style="font-size: 48px; color: #cbd5e1;"></i>
            <p class="mt-2 text-muted">No orders found</p>
          </td>
        </tr>
      `);
      return;
    }

    const groupedOrders = orders.reduce((groups, item) => {
      if (!groups[item.order_id]) {
        groups[item.order_id] = [];
      }
      groups[item.order_id].push(item);

      return groups;
    }, {});

    $("#sellerOrdersTableBody").html(
      Object.values(groupedOrders)
        .map((group) => {
          const order = group[0];
          return `
        <tr>
          <td>
            <span style="font-family: monospace; font-size: 12px; font-weight: 600;">
              ${escapeHtml(order.order_id)}
            </span>
          </td>
          <td style="font-size: 12px;">${new Date(order.date).toLocaleDateString()}</td>
          <td>
            <span class="badge-pill badge-${order.status}">${order.status}</span>
          </td>
          <td>
            <button class="btn-icon" onclick="window.viewSellerOrderDetails('${order.order_id}')" title="View Details">
              <i class="bi bi-eye"></i>
            </button>
            <select 
              class="form-ctrl-sm" 
              onchange="window.updateSellerOrderStatus('${order.order_id}', this.value)" 
              style="width: 110px; margin-left: 5px;"
            >
              <option 
                value="pending" 
                ${order.status === "pending" ? "selected" : ""}
                ${
                  ["processing", "shipped", "delivered", "cancelled"].includes(
                    order.status,
                  )
                    ? "disabled"
                    : ""
                }
              >
                Pending
              </option>

              <option 
                value="processing" 
                ${order.status === "processing" ? "selected" : ""}
                ${
                  ["shipped", "delivered", "cancelled"].includes(order.status)
                    ? "disabled"
                    : ""
                }
              >
                Processing
              </option>

              <option 
                value="shipped" 
                ${order.status === "shipped" ? "selected" : ""}
                ${["delivered", "cancelled"].includes(order.status) ? "disabled" : ""}
              >
                Shipped
              </option>

              <option 
                value="delivered" 
                ${order.status === "delivered" ? "selected" : ""}
                ${order.status === "cancelled" ? "disabled" : ""}
              >
                Delivered
              </option>

              <option 
                value="cancelled" 
                ${order.status === "cancelled" ? "selected" : ""}
                ${order.status === "delivered" ? "disabled" : ""}
              >
                Cancelled
              </option>
            </select>
          </td>
        </tr>
      `;
        })
        .join(""),
    );
  }

  function renderSellerOrdersPagination() {
    if (sellerOrdersTotalPages <= 1) {
      $("#sellerOrdersPagination").html("");
      return;
    }

    let pagesHtml = `<div class="pagination-controls">`;
    pagesHtml += `<button class="pagination-btn" onclick="window.sellerOrdersGoToPage(1)" ${sellerOrdersPage === 1 ? "disabled" : ""}>First</button>`;
    pagesHtml += `<button class="pagination-btn" onclick="window.sellerOrdersGoToPage(${sellerOrdersPage - 1})" ${sellerOrdersPage === 1 ? "disabled" : ""}>Prev</button>`;
    pagesHtml += `<span class="pagination-info">Page ${sellerOrdersPage} of ${sellerOrdersTotalPages}</span>`;
    pagesHtml += `<button class="pagination-btn" onclick="window.sellerOrdersGoToPage(${sellerOrdersPage + 1})" ${sellerOrdersPage === sellerOrdersTotalPages ? "disabled" : ""}>Next</button>`;
    pagesHtml += `<button class="pagination-btn" onclick="window.sellerOrdersGoToPage(${sellerOrdersTotalPages})" ${sellerOrdersPage === sellerOrdersTotalPages ? "disabled" : ""}>Last</button>`;
    pagesHtml += `</div>`;

    $("#sellerOrdersPagination").html(pagesHtml);
  }

  window.sellerOrdersGoToPage = function (page) {
    if (page >= 1 && page <= sellerOrdersTotalPages) {
      sellerOrdersPage = page;
      applyFiltersAndPagination(sellerOrdersPage);
    }
  };

  window.filterSellerOrders = function () {
    sellerOrdersPage = 1;
    applyFiltersAndPagination(1);
  };

  window.reloadSellerOrders = function () {
    sellerOrdersPage = 1;
    loadSellerOrders(1);
  };

  window.updateSellerOrderStatus = function (orderId, status) {
    const customerOrders = allOrders.filter(
      (data) => data.orderNumber === orderId,
    );

    if (!status) return;
    const dataToSendAPI = {
      customerOrdersData: customerOrders[0].items,
      orderId: orderId,
      customerId: customerOrders[0].customer_id,
      status: status,
    };

    Swal.fire({
      text: `Update Order Status?`,
      showCancelButton: true,
      confirmButtonText: "Yes, update it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3b82f6",
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Updating...",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
        $.ajax({
          url: `${BASE_URL}/order_status`,
          type: "POST",
          headers: getHeaders(),
          data: JSON.stringify(dataToSendAPI),
          contentType: "application/json",
          success: function (res) {
            loadSellerOrders(1);
            updateStats();

            Swal.fire({
              title: "Success!",
              text: `Order ${orderId} status updated to ${status}`,
              icon: "success",
              timer: 2000,
              showConfirmButton: false,
            });
          },
          error: function (xhr) {
            console.error("Failed to update order:", xhr);
            Swal.fire({
              title: "Error",
              text: "Failed to update order status. Please try again.",
              icon: "error",
              confirmButtonColor: "#3b82f6",
            });
          },
        });
      }
    });
  };

  window.viewSellerOrderDetails = function (orderId) {
    const orderItems = sellerOrdersList.filter((o) => o.order_id === orderId);

    if (orderItems.length === 0) {
      Swal.fire("Error", "Order not found", "error");
      return;
    }
    const firstItem = orderItems[0];
    const totalRevenue = orderItems.reduce(
      (sum, item) => sum + item.revenue,
      0,
    );

    // Create items HTML
    let itemsHtml = `
      <div style="margin-top: 15px;">
        <h6 style="margin-bottom: 10px; font-weight: 600;">Order Items:</h6>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 8px; text-align: left;">Product</th>
              <th style="padding: 8px; text-align: center;">Qty</th>
              <th style="padding: 8px; text-align: right;">Price</th>
              <th style="padding: 8px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${orderItems
              .map(
                (item) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px;"><strong>${escapeHtml(item.product_name)}</strong></td>
                <td style="padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right;">₱${(item.revenue / item.quantity).toFixed(2)}</td>
                <td style="padding: 8px; text-align: right;">₱${item.revenue.toFixed(2)}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 8px; text-align: right;">₱${firstItem.order_subtotal.toFixed(2)}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 8px; text-align: right;">VAT:</td>
              <td style="padding: 8px; text-align: right;">₱${firstItem.order_vat.toFixed(2)}</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 8px; text-align: right;">Shipping:</td>
              <td style="padding: 8px; text-align: right;">₱${firstItem.order_shipping.toFixed(2)}</td>
            </tr>
            <tr style="background: #e2e8f0; font-weight: bold;">
              <td colspan="3" style="padding: 8px; text-align: right;">Total:</td>
              <td style="padding: 8px; text-align: right;">₱${firstItem.total_amount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    Swal.fire({
      html: `
        <div style="text-align: left;">
          <p><strong>Order#:</strong> ${orderId}</p>
          <p><strong>Customer:</strong> ${escapeHtml(firstItem.customer_name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(firstItem.customer_email)}</p>
          <p><strong>Status:</strong> <span class="badge-pill badge-${firstItem.status}">${firstItem.status}</span></p>
          <p><strong>Date:</strong> ${new Date(firstItem.date).toLocaleString()}</p>
          ${itemsHtml}
        </div>
      `,
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
      width: "650px",
    });
  };

  window.exportSellerSales = function () {
    if (sellerOrdersList.length === 0) {
      Swal.fire("Error", "No data to export", "error");
      return;
    }

    // Get current filtered orders
    const searchTerm = $("#sellerOrderSearch").val()?.toLowerCase();
    const statusFilter = $("#sellerOrderStatusFilter").val();

    let filteredOrders = [...sellerOrdersList];

    if (searchTerm) {
      filteredOrders = filteredOrders.filter(
        (order) =>
          order.order_id.toLowerCase().includes(searchTerm) ||
          order.product_name.toLowerCase().includes(searchTerm) ||
          order.customer_name.toLowerCase().includes(searchTerm),
      );
    }

    if (statusFilter) {
      filteredOrders = filteredOrders.filter(
        (order) => order.status === statusFilter,
      );
    }

    // Generate CSV
    const headers = [
      "Order ID",
      "Product",
      "Quantity",
      "Revenue",
      "Status",
      "Date",
      "Customer",
    ];
    const rows = filteredOrders.map((order) => [
      order.order_id,
      order.product_name,
      order.quantity,
      order.revenue,
      order.status,
      new Date(order.date).toLocaleDateString(),
      order.customer_name,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seller_orders_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Swal.fire("Success", "Orders exported successfully!", "success");
  };

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  }

  // INIT FUNCTION
  window.initSellerOrders = function (forceReload = false) {
    if (forceReload) {
      sellerOrdersList = [];
      sellerOrdersPage = 1;
      sellerOrdersTotalPages = 1;
    }
    loadSellerOrders(1);
  };
}
