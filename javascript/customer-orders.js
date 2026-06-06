// Prevent multiple execution
if (typeof window.transactionsPageInitialized === "undefined") {
  window.transactionsPageInitialized = true;

  // Use window to avoid redeclare
  window.txnPage = 1;
  window.TXN_PER_PAGE = 10;
  window.allOrders = [];

  function loadOrders() {
    $.ajax({
      url: `${BASE_URL}/customer_order_history`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        window.allOrders = res;
        renderTransactions();
      },
      error: function (xhr) {
        console.log(xhr.status, xhr.responseText);
        $("#txnTableBody").html(`
          <tr>
            <td colspan="6" class="text-center py-5 text-danger">
              Failed to load orders. Please try again.
            </td>
          </tr>
        `);
      },
    });
  }

  function getFilteredAndSortedOrders() {
    let orders = [...window.allOrders];

    // Get filter values
    $("#txnSearch").val(localStorage.getItem("orderId") ?? "");
    const statusFilter = $("#txnStatusFilter").val();
    const searchTerm = $("#txnSearch").val()?.toLowerCase();
    const sortField = $("#txnSortField").val();
    const sortDir = $("#txnSortDir").val();

    // Apply status filter
    if (statusFilter) {
      orders = orders.filter((order) => order.status === statusFilter);
    }

    // Apply search filter (search by order number or customer name)
    if (searchTerm) {
      orders = orders.filter((order) => {
        // Product names
        const productNames = order.items
          ?.map((item) => item.product?.name || "")
          .join(" ")
          .toLowerCase();

        return (
          // Order ID
          (order.id && order.id.toString().includes(searchTerm)) ||
          // Order Number
          (order.orderNumber &&
            order.orderNumber.toLowerCase().includes(searchTerm)) ||
          // Product Names
          productNames.includes(searchTerm)
        );
      });

      localStorage.removeItem("orderId");
    }

    // Apply sorting
    orders.sort((a, b) => {
      let aVal, bVal;

      switch (sortField) {
        case "order_number":
          aVal = a.order_number || a.id;
          bVal = b.order_number || b.id;
          break;
        case "customer_name":
          aVal = a.customer_name || "Guest";
          bVal = b.customer_name || "Guest";
          break;
        case "total":
          aVal = parseFloat(a.total) || 0;
          bVal = parseFloat(b.total) || 0;
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "created_at":
        default:
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
      }

      if (sortDir === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return orders;
  }

  function renderTransactions() {
    if (!window.allOrders.length) {
      $("#txnTableBody").html(`
        <tr>
          <td colspan="6" class="text-center py-5">
            No orders found
          </td>
        </tr>
      `);
      return;
    }

    let filteredOrders = getFilteredAndSortedOrders();

    const total = filteredOrders.length;
    const start = (window.txnPage - 1) * window.TXN_PER_PAGE;
    const page = filteredOrders.slice(start, start + window.TXN_PER_PAGE);

    if (page.length === 0) {
      $("#txnTableBody").html(`
        <tr>
          <td colspan="6" class="text-center py-5">
            No orders match your filters
          </td>
        </tr>
      `);
      renderPagination(
        "#txnPagination",
        0,
        window.txnPage,
        window.TXN_PER_PAGE,
        () => {},
      );
      return;
    }

    function getStatusBadgeClass(status) {
      const statusMap = {
        pending: "badge-pending",
        processing: "badge-processing",
        shipped: "badge-shipped",
        delivered: "badge-delivered",
        cancelled: "badge-cancelled",
      };
      return statusMap[status] || "badge-pending";
    }

    $("#txnTableBody").html(
      page
        .map((order) => {
          const product_items = order.items
            .map((item) => item.product.name)
            .join(", ");

          return `
        <tr>
          <td>${escapeHtml(order.orderNumber || order.id)}</td>
          <td>${escapeHtml(product_items)}</td>
          <td>₱${parseFloat(order.total).toFixed(2)}</td>
          <td>
            <span class="badge-pill ${getStatusBadgeClass(order.status)}">
              ${escapeHtml(order.status)}
            </span>
          </td>
          <td>${new Date(order.created_at).toLocaleDateString()}</td>
          <td>
            ${
              order.status == "pending"
                ? `
                <button class="cancel-order-btn" onclick="cancelOrderDetails(${order.id})" title="Cancel Order">
                  <i class="bi bi-x-circle"></i> 
                </button>
              `
                : ""
            }

            <button class="view-order-btn" onclick="viewOrderDetails(${order.id})" title="View order details">
              <i class="bi bi-eye"></i>
            </button>
          </td>
        </tr>
      `;
        })
        .join(""),
    );

    renderPagination(
      "#txnPagination",
      total,
      window.txnPage,
      window.TXN_PER_PAGE,
      (n) => {
        window.txnPage = n;
        renderTransactions();
      },
    );
  }

  window.cancelOrderDetails = function (id) {
    if (confirm(`Are you sure you want to cancel this order?`)) {
      $.ajax({
        url: `${BASE_URL}/cancel_order`,
        type: "POST",
        data: JSON.stringify({ order_id: id }),
        headers: getHeaders(),
        success: function (res) {
          if (res.status) {
            showToast("Order cancelled", "info");
            loadOrders();
          } else {
            showToast("Something went wrong!", "warning");
          }
        },
        error: function (xhr) {
          console.log(xhr.status, xhr.responseText);
          showToast("Something went wrong!", "warning");
        },
      });
    }
  };

  window.viewOrderDetails = function (orderId) {
    const order = window.allOrders.find((o) => o.id === orderId);
    if (!order) return;

    console.log(order.items);
    // Format items HTML from the actual data structure
    let itemsHtml = "";
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      itemsHtml = `
      <div class="order-items-section" style="margin-top: 12px;">
        <h6 style="margin: 0 0 8px 0; color: #1e293b; font-weight: 600; font-size: 13px;">Order Items:</h6>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 6px 8px; text-align: left;">Product</th>
              <th style="padding: 6px 8px; text-align: center;">Qty</th>
              <th style="padding: 6px 8px; text-align: right;">Price</th>
              <th style="padding: 6px 8px; text-align: right;">Subtotal</th>
             </tr>
          </thead>
          <tbody>
            ${order.items
              .map((item) => {
                const productName = item.product?.name || "N/A";
                const price = parseFloat(item.product?.price || 0);
                const quantity = item.quantity || 1;
                const subtotal = price * quantity;
                return `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 6px 8px;">
                      <strong style="font-size: 12px;">${escapeHtml(productName)}</strong>
                      ${item.product?.category ? `<br><small style="color: #64748b; font-size: 10px;">${escapeHtml(item.product.category)}</small>` : ""}
                    </td>
                    <td style="padding: 6px 8px; text-align: center;">${quantity}</td>
                    <td style="padding: 6px 8px; text-align: right;">₱${price.toFixed(2)}</td>
                    <td style="padding: 6px 8px; text-align: right;">₱${subtotal.toFixed(2)}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 6px 8px; text-align: right; font-weight: 500;">Subtotal:</td>
              <td style="padding: 6px 8px; text-align: right; font-weight: 500;">₱${parseFloat(order.subtotal || 0).toFixed(2)}</td>
            </tr>
            ${
              order.vat
                ? `
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 6px 8px; text-align: right; font-weight: 500;">VAT (12%):</td>
              <td style="padding: 6px 8px; text-align: right; font-weight: 500;">₱${parseFloat(order.vat).toFixed(2)}</td>
            </tr>
            `
                : ""
            }
            ${
              order.shipping
                ? `
            <tr style="background: #f8fafc;">
              <td colspan="3" style="padding: 6px 8px; text-align: right; font-weight: 500;">Shipping:</td>
              <td style="padding: 6px 8px; text-align: right; font-weight: 500;">₱${parseFloat(order.shipping).toFixed(2)}</td>
            </tr>
            `
                : ""
            }
            <tr style="background: #e2e8f0; font-weight: bold;">
              <td colspan="3" style="padding: 8px; text-align: right;">Total:</td>
              <td style="padding: 8px; text-align: right;">₱${parseFloat(order.total).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
    }

    // Get status badge style
    const getStatusBadgeStyle = (status) => {
      const styles = {
        pending: { background: "#fef3c7", color: "#d97706" },
        processing: { background: "#e0f2fe", color: "#0284c7" },
        paid: { background: "#d1fae5", color: "#059669" },
        shipped: { background: "#ede9fe", color: "#7c3aed" },
        delivered: { background: "#d1fae5", color: "#059669" },
        cancelled: { background: "#fee2e2", color: "#dc2626" },
      };
      return styles[status] || styles["pending"];
    };

    const statusStyle = getStatusBadgeStyle(order.status);

    const uniqueSellerIds = [
      ...new Set(order.items.map((item) => item.product.seller_id)),
    ];
    // Compact HTML layout without scroll
    const compactHtml = `
    <style>
      .compact-order-details {
        text-align: left;
        overflow: visible;
      }
      .compact-info-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .compact-info-label {
        font-weight: 600;
        color: #64748b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .compact-info-value {
        color: #1e293b;
        font-size: 13px;
        font-weight: 500;
      }
      .status-badge-compact {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        background: ${statusStyle.background};
        color: ${statusStyle.color};
      }
      .compact-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 10px 0;
      }
      .compact-footer {
        background: #f8fafc;
        padding: 8px 12px;
        margin: 12px -16px -16px -16px;
        font-size: 11px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
        border-radius: 0 0 8px 8px;
      }
      .order-items-section {
        overflow: visible;
      }
      .order-items-section table {
        overflow: visible;
      }
    </style>
    <div class="compact-order-details">
      <div class="compact-info-row">
        <span class="compact-info-label">Order #:</span>
        <span class="compact-info-value">${escapeHtml(order.orderNumber || "N/A")}</span>
      </div>
      <div class="compact-info-row">
        <span class="compact-info-label">Status:</span>
        <span class="compact-info-value">
          <span class="status-badge-compact">${escapeHtml(order.status || "N/A")}</span>
        </span>
      </div>
      <div class="compact-info-row">
        <span class="compact-info-label">Seller ID:</span>
        <span class="compact-info-value">${uniqueSellerIds[0] || "N/A"}</span>
      </div>
      <div class="compact-info-row">
        <span class="compact-info-label">Customer ID:</span>
        <span class="compact-info-value">${order.customer_id || "N/A"}</span>
      </div>
      <div class="compact-info-row">
        <span class="compact-info-label">Order Date:</span>
        <span class="compact-info-value">${new Date(order.created_at).toLocaleString()}</span>
      </div>
      ${
        order.updated_at
          ? `
      <div class="compact-info-row">
        <span class="compact-info-label">Updated:</span>
        <span class="compact-info-value">${new Date(order.updated_at).toLocaleString()}</span>
      </div>
      `
          : ""
      }
      
      <div class="compact-divider"></div>
      
      ${itemsHtml}
      
      <div class="compact-footer">
        <span>Order ID: ${order.id}</span>
        <span>${order.items ? order.items.length + " item(s)" : "0 items"}</span>
      </div>
    </div>
  `;

    Swal.fire({
      html: compactHtml,
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
      width: "500px",
      padding: "16px",
      customClass: {
        popup: "compact-order-swal",
        htmlContainer: "p-0",
      },
      // These options help remove scroll
      heightAuto: true,
      backdrop: true,
      didOpen: () => {
        // Remove scroll from the modal body
        const modal = document.querySelector(".swal2-container");
        if (modal) {
          modal.style.overflow = "visible";
        }
        const popup = document.querySelector(".swal2-popup");
        if (popup) {
          popup.style.overflow = "visible";
        }
        const htmlContainer = document.querySelector(".swal2-html-container");
        if (htmlContainer) {
          htmlContainer.style.overflow = "visible";
          htmlContainer.style.maxHeight = "none";
        }
      },
    });
  };

  // Sort cycling function
  window.cycleTxnSort = function (field) {
    const currentField = $("#txnSortField").val();
    const currentDir = $("#txnSortDir").val();

    if (currentField === field) {
      // Cycle through asc, desc, and back to default
      if (currentDir === "desc") {
        $("#txnSortDir").val("asc");
      } else if (currentDir === "asc") {
        $("#txnSortField").val("created_at");
        $("#txnSortDir").val("desc");
      }
    } else {
      $("#txnSortField").val(field);
      $("#txnSortDir").val("desc");
    }

    window.txnPage = 1; // Reset to first page when sorting
    renderTransactions();
  };

  function renderPagination(selector, total, page, perPage, onPageChange) {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages <= 1) {
      $(selector).html("");
      return;
    }

    let html = `<div class="pagination-controls">
                  <button class="pagination-btn" data-page="1" ${page === 1 ? "disabled" : ""}>First</button>
                  <button class="pagination-btn" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}>Prev</button>
                  <span class="pagination-info">Page ${page} of ${totalPages}</span>
                  <button class="pagination-btn" data-page="${page + 1}" ${page === totalPages ? "disabled" : ""}>Next</button>
                  <button class="pagination-btn" data-page="${totalPages}" ${page === totalPages ? "disabled" : ""}>Last</button>
                </div>`;

    const wrapper = $(selector);
    wrapper.html(html);

    wrapper.find("button").on("click", function () {
      const p = parseInt($(this).data("page"));
      if (!isNaN(p) && p >= 1 && p <= totalPages) onPageChange(p);
    });
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
  window.initTransactionsPage = function () {
    window.txnPage = 1;
    loadOrders();
  };

  // Add CSS for pagination
  const paginationStyle = document.createElement("style");
  paginationStyle.textContent = `
    .pagination-controls {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
    }
    .pagination-btn {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .pagination-btn:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pagination-info {
      padding: 0 12px;
      font-size: 14px;
      color: #475569;
    }
  `;
  document.head.appendChild(paginationStyle);
}
