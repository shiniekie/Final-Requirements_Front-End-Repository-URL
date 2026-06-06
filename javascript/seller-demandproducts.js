// Demand Products - Add this to your seller dashboard or products page
if (typeof window.demandProductsInitialized === "undefined") {
  window.demandProductsInitialized = true;

  let demandProductsList = [];
  let demandProductsPage = 1;
  let demandProductsTotalPages = 1;

  // Load demand products (most ordered items)
  function loadDemandProducts(page = 1) {
    const container = $(".product-list-container");
    if (container.length === 0) return;

    container.html(`
      <div class="text-center py-4">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-2 text-muted">Loading demand products...</p>
      </div>
    `);

    $.ajax({
      url: `${BASE_URL}/customer_orders`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        console.log("Demand products - orders response:", res);

        const orders = Array.isArray(res) ? res : res.data || res.orders || [];

        // Calculate product demand
        const productDemand = new Map(); // product_id -> { name, category, total_quantity, total_revenue, orders_count }

        orders.forEach((order) => {
          (order.items || []).forEach((item) => {
            const productId = item.product?.id || item.product_id;
            const productName = item.product?.name || "Unknown Product";
            const productCategory = item.product?.category || "Uncategorized";
            const quantity = item.quantity || 1;
            const price = parseFloat(item.product?.price || 0);
            const revenue = price * quantity;

            if (productDemand.has(productId)) {
              const existing = productDemand.get(productId);
              existing.total_quantity += quantity;
              existing.total_revenue += revenue;
              existing.orders_count += 1;
            } else {
              productDemand.set(productId, {
                id: productId,
                name: productName,
                category: productCategory,
                total_quantity: quantity,
                total_revenue: revenue,
                orders_count: 1,
              });
            }
          });
        });

        // Convert to array and sort by total_quantity (highest first)
        demandProductsList = Array.from(productDemand.values()).sort(
          (a, b) => b.total_quantity - a.total_quantity,
        );

        console.log("Demand products:", demandProductsList);

        // Render demand products
        renderDemandProducts();
      },
      error: function (xhr) {
        console.error("Failed to load demand products:", xhr);
        container.html(`
          <div class="text-center py-4 text-danger">
            <i class="bi bi-exclamation-triangle" style="font-size: 32px;"></i>
            <p class="mt-2">Failed to load demand data</p>
            <button class="btn-primary-app btn-sm" onclick="window.reloadDemandProducts()">Retry</button>
          </div>
        `);
      },
    });
  }

  function renderDemandProducts() {
    const container = $(".product-list-container");

    if (demandProductsList.length === 0) {
      container.html(`
        <div class="text-center py-4">
          <i class="bi bi-bar-chart-steps" style="font-size: 48px; color: #cbd5e1;"></i>
          <p class="mt-2 text-muted">No demand data available yet</p>
          <p class="small text-muted">Start selling products to see demand metrics</p>
        </div>
      `);
      return;
    }

    // Show top 5 demand products
    const topProducts = demandProductsList.slice(0, 5);
    const maxQuantity = topProducts[0]?.total_quantity || 1;

    container.html(`
      <div style="padding: 4px 0;">
        ${topProducts
          .map((product, index) => {
            const barWidth = (product.total_quantity / maxQuantity) * 100;
            const trendIcon = index === 0 ? " " : index <= 2 ? " " : " ";
            const revenue = parseFloat(product.total_revenue).toFixed(2);

            return `
            <div class="demand-product-item" onclick="window.viewProductDemandDetails(${product.id})" style="cursor: pointer;">
              <div class="demand-product-header">
                <div class="demand-product-rank">
                  <span class="rank-badge rank-${index + 1}">#${index + 1}</span>
                  <span class="trend-icon">${trendIcon}</span>
                </div>
                <div class="demand-product-info">
                  <div class="product-name">${escapeHtml(product.name)}</div>
                  <div class="product-category">${escapeHtml(product.category)}</div>
                </div>
                <div class="demand-product-stats">
                  <div class="stat-value">${product.total_quantity}</div>
                  <div class="stat-label">sold</div>
                </div>
              </div>
              <div class="progress-bar-container" style="margin: 8px 0;">
                <div class="progress-bar-fill demand-progress" style="width: ${barWidth}%;"></div>
              </div>
              <div class="demand-product-footer">
                <div class="revenue-info">
                  <i class="bi bi-currency-dollar"></i> ₱${revenue}
                </div>
                <div class="orders-info">
                  <i class="bi bi-bag"></i> ${product.orders_count} order${product.orders_count !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>
      ${
        demandProductsList.length > 5
          ? `
        <div class="text-center mt-3">
          <button class="btn-ghost btn-sm" onclick="window.showAllDemandProducts()">
            View All (${demandProductsList.length} products)
          </button>
        </div>
      `
          : ""
      }
    `);
  }

  window.viewProductDemandDetails = function (productId) {
    const product = demandProductsList.find((p) => p.id === productId);
    if (!product) return;

    Swal.fire({
      title: product.name,
      html: `
        <div style="text-align: left;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 15px; border-radius: 12px; margin-bottom: 20px; color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 12px; opacity: 0.9;">Demand Score</div>
                <div style="font-size: 28px; font-weight: bold;">${product.total_quantity}</div>
                <div style="font-size: 11px; opacity: 0.8;">units sold</div>
              </div>
              <div>
                <i class="bi bi-trophy" style="font-size: 48px;"></i>
              </div>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 10px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">₱${parseFloat(product.total_revenue).toFixed(2)}</div>
              <div style="font-size: 12px; color: #64748b;">Total Revenue</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 10px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">${product.orders_count}</div>
              <div style="font-size: 12px; color: #64748b;">Total Orders</div>
            </div>
          </div>
          
          <div style="background: #f0fdf4; padding: 12px; border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: 600;">Category:</span>
              <span>${escapeHtml(product.category)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-weight: 600;">Avg. Price per Unit:</span>
              <span>₱${(parseFloat(product.total_revenue) / product.total_quantity).toFixed(2)}</span>
            </div>
          </div>
        </div>
      `,
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
      width: "450px",
    });
  };

  window.showAllDemandProducts = function () {
    if (demandProductsList.length === 0) return;

    let productsHtml = `
      <div style="max-height: 500px; overflow-y: auto;">
        <div style="background: #f8fafc; padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; font-weight: 600;">
          <span>Product</span>
          <span>Sold</span>
          <span>Revenue</span>
        </div>
    `;

    demandProductsList.forEach((product, index) => {
      productsHtml += `
        <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">${escapeHtml(product.name)}</div>
            <div style="font-size: 11px; color: #64748b;">${escapeHtml(product.category)}</div>
          </div>
          <div style="text-align: center;">
            <span class="badge-pill badge-processing" style="background:#e0f2fe;">${product.total_quantity} sold</span>
          </div>
          <div style="font-weight: 600; color: #059669;">₱${parseFloat(product.total_revenue).toFixed(2)}</div>
        </div>
      `;
    });

    productsHtml += `</div>`;

    Swal.fire({
      title: "All Products Demand",
      html: productsHtml,
      icon: "info",
      confirmButtonText: "Close",
      confirmButtonColor: "#3b82f6",
      width: "600px",
    });
  };

  window.reloadDemandProducts = function () {
    loadDemandProducts();
  };

  let refreshInterval = null;

  function startDemandProductsAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
      loadDemandProducts();
    }, 30000); // Refresh every 30 seconds
  }

  function stopDemandProductsAutoRefresh() {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
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

  // INIT FUNCTION
  window.initDemandProducts = function () {
    loadDemandProducts();
    startDemandProductsAutoRefresh();
  };

  // Cleanup function for when page changes
  window.cleanupDemandProducts = function () {
    stopDemandProductsAutoRefresh();
  };
}
