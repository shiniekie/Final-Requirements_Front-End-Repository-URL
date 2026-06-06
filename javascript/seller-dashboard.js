// Seller Dashboard - Prevent multiple execution with data persistence
if (typeof window.sellerDashboardInitialized === "undefined") {
  window.sellerDashboardInitialized = true;

  let sellerOrders = [];
  let sellerProductsList = [];
  let isDataLoaded = false; // Track if data has been loaded

  // Load dashboard data only once
  function loadSellerDashboard(forceReload = false) {
    if (!isDataLoaded || forceReload) {
      loadSellerStats();
      loadSellerProducts();
      loadRecentOrders();
      isDataLoaded = true;
    } else {
      renderDashboardUI();
    }
  }

  // Re-render UI without fetching new data
  function renderDashboardUI() {
    // Re-render stats
    const totalSales = sellerOrders.length;
    const revenue = sellerOrders
      .filter((o) => o.status === "paid" || o.status === "processing")
      .reduce((sum, o) => sum + parseFloat(o.amount), 0);
    const pendingOrders = sellerOrders.filter(
      (o) => o.status === "pending",
    ).length;

    $("#dash-total-products").text(sellerProductsList.length);
    $("#dash-total-sales").text(totalSales);
    $("#dash-total-revenue").text("₱" + revenue.toLocaleString());
    $("#dash-pending-orders").text(pendingOrders);

    // Update progress bar
    const target = 50000;
    const progressPercent = Math.min((revenue / target) * 100, 100);
    $("#salesProgress").css("width", progressPercent + "%");

    // Re-render orders
    renderSellerOrdersTable();
  }

  async function loadSellerStats() {
    try {
      const response = await fetch(`${BASE_URL}/products`, {
        headers: getHeaders(),
      });

      const result = await response.json();
      const products = result.data || result || [];
      sellerProductsList = products;

      // Count products
      $("#dash-total-products").text(products.length);

      // Fetch orders
      await fetchCustomerOrders();

      const totalSales = sellerOrders.length;
      const revenue = sellerOrders
        .filter(
          (o) =>
            o.status === "paid" ||
            o.status === "processing" ||
            o.status === "shipped" ||
            o.status === "delivered",
        )
        .reduce((sum, o) => sum + parseFloat(o.amount), 0);
      const pendingOrders = sellerOrders.filter(
        (o) => o.status === "pending",
      ).length;

      $("#dash-total-sales").text(totalSales);
      $("#dash-total-revenue").text("₱" + revenue.toLocaleString());
      $("#dash-pending-orders").text(pendingOrders);

      // Update progress
      const target = 50000;
      const progressPercent = Math.min((revenue / target) * 100, 100);
      $("#salesProgress").css("width", progressPercent + "%");
    } catch (error) {
      console.error("Error loading stats:", error);
      $("#dash-total-products").text(sellerProductsList.length || 5);
      $("#dash-total-sales").text(sellerOrders.length);
      const revenue = sellerOrders
        .filter((o) => o.status === "paid" || o.status === "processing")
        .reduce((sum, o) => sum + parseFloat(o.amount), 0);
      $("#dash-total-revenue").text("₱" + revenue.toLocaleString());
      $("#dash-pending-orders").text(
        sellerOrders.filter((o) => o.status === "pending").length,
      );
    }
  }

  // ***********************************
  function fetchCustomerOrders() {
    return new Promise((resolve, reject) => {
      $("#dash-orders-table").html(`
      <tr>
        <td colspan="5" class="text-center">Loading orders...</td>
      </tr>
    `);

      $.ajax({
        url: `${BASE_URL}/customer_orders`,
        type: "GET",
        headers: getHeaders(),
        success: function (res) {
          console.log("Orders response:", res);

          // Handle the response - it's an array directly
          const orders = Array.isArray(res)
            ? res
            : res.data || res.orders || [];
          sellerOrders = [];

          orders.forEach((order) => {
            // Process each item in the order
            (order.items || []).forEach((item) => {
              sellerOrders.push({
                id: order.orderNumber || order.order_number || order.id,
                product_id: item.product?.id || item.product_id,
                product_name: item.product?.name || "Unknown Product",
                product_price: item.product?.price || 0,
                amount: parseFloat(order.total) || 0,
                status: order.status,
                date: order.created_at,
                customer_name: order.customer?.name || "Guest",
                quantity: item.quantity || 1,
                subtotal: parseFloat(order.subtotal) || 0,
                vat: parseFloat(order.vat) || 0,
                shipping: parseFloat(order.shipping) || 0,
              });
            });
          });

          console.log("Processed seller orders:", sellerOrders);
          renderSellerOrdersTable();
          resolve(sellerOrders);
        },
        error: function (xhr) {
          console.log("Failed to fetch orders:", xhr);
          console.log("Status:", xhr.status);
          console.log("Response:", xhr.responseText);

          // Show error in table
          $("#dash-orders-table").html(`
          <tr>
            <td colspan="5" class="text-center text-danger">
              Failed to load orders. Error: ${xhr.status} ${xhr.statusText}
            </td>
          </tr>
        `);

          reject(xhr);
        },
      });
    });
  }

  function renderSellerOrdersTable() {
    const recentOrders = [...sellerOrders].reverse().slice(0, 5);

    if (recentOrders.length === 0) {
      $("#dash-orders-table").html(`
      <tr>
        <td colspan="5" style="text-align: center; padding: 40px;">
          <i class="bi bi-inbox" style="font-size: 48px; color: #cbd5e1;"></i>
          <p class="mt-2">No orders found</p>
        </td>
      </tr>
    `);
      return;
    }

    const groupedOrders = recentOrders.reduce((groups, item) => {
      if (!groups[item.id]) {
        groups[item.id] = [];
      }
      groups[item.id].push(item);

      return groups;
    }, {});

    $("#dash-orders-table").html(
      Object.values(groupedOrders)
        .map((group) => {
          const order = group[0];
          return `
      <tr>
        <td>
          <span style="font-family: monospace; font-size: 12px; font-weight: 600;">
            ${escapeHtml(order.id)}
          </span>
        </td>
        <td>
          <span class="badge-pill badge-${order.status}">
            ${order.status}
          </span>
        </td>
      </tr>
    `;
        })
        .join(""),
    );
  }

  // Enhanced update order status with API call
  window.updateOrderStatus = function (orderId, status) {
    if (!status) return;
    const orderItems = sellerOrders.filter((o) => o.id === orderId);

    if (orderItems.length > 0) {
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
            data: JSON.stringify({
              orderId: orderId,
              status: status,
            }),
            contentType: "application/json",
            success: function (res) {
              console.log(res);
              sellerOrders.forEach((order) => {
                if (order.id === orderId) {
                  order.status = status;
                }
              });

              // Re-render tables
              renderSellerOrdersTable();
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
    } else {
      Swal.fire({
        title: "Error",
        text: "Order not found",
        icon: "error",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  window.viewOrderDetails = function (orderId) {
    const orderItems = sellerOrders.filter((o) => o.id === orderId);
    console.log(orderItems);
    if (orderItems.length === 0) {
      Swal.fire("Error", "Order not found", "error");
      return;
    }

    // Get first item for order info
    const firstItem = orderItems[0];
    const totalAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);
    const subtotal = orderItems.reduce(
      (sum, item) => sum + (item.subtotal || item.amount),
      0,
    );

    // Create items HTML
    let itemsHtml = `
    <div style="margin-top: 15px;">
      <h6 style="margin-bottom: 10px;">Order Items:</h6>
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
              <td style="padding: 8px;">${escapeHtml(item.product_name)}</td>
              <td style="padding: 8px; text-align: center;">${item.quantity}</td>
              <td style="padding: 8px; text-align: right;">₱${parseFloat(item.product_price).toFixed(2)}</td>
              <td style="padding: 8px; text-align: right;">₱${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr style="background: #f8fafc;">
            <td colspan="3" style="padding: 8px; text-align: right;"><strong>Subtotal:</strong></td>
            <td style="padding: 8px; text-align: right;">₱${subtotal.toFixed(2)}</td>
          </tr>
          ${
            firstItem.vat
              ? `
          <tr style="background: #f8fafc;">
            <td colspan="3" style="padding: 8px; text-align: right;">VAT:</td>
            <td style="padding: 8px; text-align: right;">₱${firstItem.vat.toFixed(2)}</td>
          </tr>
          `
              : ""
          }
          ${
            firstItem.shipping
              ? `
          <tr style="background: #f8fafc;">
            <td colspan="3" style="padding: 8px; text-align: right;">Shipping:</td>
            <td style="padding: 8px; text-align: right;">₱${firstItem.shipping.toFixed(2)}</td>
          </tr>
          `
              : ""
          }
          <tr style="background: #e2e8f0; font-weight: bold;">
            <td colspan="3" style="padding: 8px; text-align: right;">Total:</td>
            <td style="padding: 8px; text-align: right;">₱${totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;

    Swal.fire({
      html: `
      <div style="text-align: left;">
        <p><strong>Customer:</strong> ${escapeHtml(firstItem.customer_name)}</p>
        <p><strong>Status:</strong> <span class="badge-pill badge-${firstItem.status}">${firstItem.status}</span></p>
        <p><strong>Date:</strong> ${new Date(firstItem.date).toLocaleString()}</p>
        ${itemsHtml}
      </div>
    `,
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
    });
  };

  // Update stats function
  function updateStats() {
    const totalSales = sellerOrders.length;
    const revenue = sellerOrders
      .filter((o) =>
        ["paid", "processing", "shipped", "delivered"].includes(o.status),
      )
      .reduce((sum, o) => sum + o.amount, 0);
    const pendingOrders = sellerOrders.filter(
      (o) => o.status === "pending",
    ).length;
    const uniqueProducts = new Set(sellerOrders.map((o) => o.product_id)).size;

    $("#dash-total-products").text(uniqueProducts || sellerProductsList.length);
    $("#dash-total-sales").text(totalSales);
    $("#dash-total-revenue").text("₱" + revenue.toLocaleString());
    $("#dash-pending-orders").text(pendingOrders);

    // Update progress bar
    const target = 50000;
    const progressPercent = Math.min((revenue / target) * 100, 100);
    if ($("#salesProgress").length) {
      $("#salesProgress").css("width", progressPercent + "%");
    }
  }
  // ***********************************

  function loadSellerProducts() {
    console.log("Products loaded:", sellerProductsList.length);
  }

  async function loadRecentOrders() {
    try {
      await fetchCustomerOrders();
      renderSellerOrdersTable();
    } catch (error) {
      console.error("Error loading orders:", error);
      $("#dash-orders-table").html(
        '<tr><td colspan="5" style="text-align: center;">Error loading orders</td></tr>',
      );
    }
  }

  window.exportSalesReport = function () {
    if (sellerOrders.length === 0) {
      Swal.fire("Error", "No data to export", "error");
      return;
    }

    // Generate CSV report
    const headers = ["Order ID", "Product", "Amount", "Status", "Date"];
    const rows = sellerOrders.map((order) => [
      order.id,
      order.product_name,
      order.amount,
      order.status,
      new Date(order.date).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Swal.fire("Success", "Sales report exported successfully!", "success");
  };

  window.viewAllOrders = function () {
    // Navigate to orders page or show all orders
    if (typeof navigate === "function") {
      navigate("seller-orders");
    } else {
      Swal.fire("Orders", "View all orders page", "info");
    }
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
  window.initSellerDashboard = function (forceReload = false) {
    loadSellerDashboard(forceReload);
  };
}
