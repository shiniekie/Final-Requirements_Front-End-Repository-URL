// Prevent redeclaration when page reloads via jQuery.load
if (typeof window.customerPageInitialized === "undefined") {
  window.customerPageInitialized = true;

  // GLOBAL STATE (attach to window to avoid redeclare error)
  window.currentCustomerPage = 1;
  window.totalCustomerPages = 1;
  window.allCustomerProducts = [];
  window.customerCart = [];

  // ================= CART =================
  function loadCustomerCart() {
    const savedCart = localStorage.getItem("customer_cart");
    if (savedCart) {
      window.customerCart = JSON.parse(savedCart);
      updateCartBadge();
    }
  }

  function saveCustomerCart() {
    localStorage.setItem("customer_cart", JSON.stringify(window.customerCart));
    updateCartBadge();
  }

  function updateCartBadge() {
    const totalItems = window.customerCart.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const cartBadge = document.getElementById("cartCount");

    if (cartBadge) {
      cartBadge.style.display = totalItems > 0 ? "inline-block" : "none";
      cartBadge.textContent = totalItems;
    }
  }

  // ================= FETCH =================
  function fetchCustomerProducts(page = 1) {
    const grid = document.getElementById("productGrid");

    if (grid) {
      grid.innerHTML = `<div class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>`;
    }

    $.ajax({
      url: `${BASE_URL}/public/products`,
      type: "GET",
      data: { page },
      headers: getHeaders(),
      success: function (result) {
        console.log(result);
        const products = result.data || result || [];

        window.allCustomerProducts = products;
        window.totalCustomerPages = result.last_page || 1;
        window.currentCustomerPage = result.current_page || page;

        renderCustomerProducts(products);
        renderCustomerPagination();
      },
      error: function () {
        if (grid) {
          grid.innerHTML = `<div class="text-center text-danger">Failed to load</div>`;
        }
      },
    });
  }

  // ================= RENDER =================
  const originalRender = renderCustomerProducts;

  function renderCustomerProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `<div class="empty-state">
      <i class="bi bi-emoji-frown"></i>
      <p>No products found</p>
    </div>`;
      return;
    }

    grid.innerHTML = products
      .map((p) => {
        const img =
          p.images?.[0] || "https://placehold.co/400x300?text=No+Image";
        const inStock = p.stock > 0;
        return `
      <div class="product-card">
        <div class="product-image">
          <img src="${img}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/400x300?text=Image+Error'">
          <span class="category-badge">${escapeHtml(p.category)}</span>
        </div>
        <div class="product-info">
          <h3 class="product-title">${escapeHtml(p.name)}</h3>
          <p class="product-description">${escapeHtml(p.description?.substring(0, 80) || "No description")}</p>
          <div class="price-row">
            <span class="product-price">₱${parseFloat(p.price).toFixed(2)}</span>
            <span class="stock-badge ${inStock ? "stock-in" : "stock-out"}">
              ${inStock ? `In Stock (${p.stock})` : "Out of Stock"}
            </span>
          </div>
          ${
            inStock
              ? `<button class="add-to-cart-btn"
                data-id="${p.id}"
                data-sellerid="${p.seller_id}"
                data-name="${escapeHtml(p.name)}"
                data-price="${p.price}"
                data-image="${p.images?.[0] || ""}"
                data-stock="${p.stock}">
                <i class="bi bi-cart-plus"></i> Add to Cart
              </button>`
              : `<button class="add-to-cart-btn" disabled>
                <i class="bi bi-cart-x"></i> Out of Stock
              </button>`
          }
        </div>
      </div>
    `;
      })
      .join("");
  }

  $(document).on("click", ".add-to-cart-btn:not(:disabled)", function () {
    const btn = $(this);

    const id = btn.data("id");
    const sellerid = btn.data("sellerid");
    const name = btn.data("name");
    const price = parseFloat(btn.data("price"));
    const image = btn.data("image");
    const stock = parseInt(btn.data("stock"));

    addToCart(id, sellerid, name, price, image, stock);
  });

  const originalPagination = renderCustomerPagination;
  function renderCustomerPagination() {
    const wrapper = document.getElementById("productPagination");
    if (!wrapper) return;

    wrapper.innerHTML = `
      <button onclick="changeCustomerPage(${window.currentCustomerPage - 1})" ${window.currentCustomerPage === 1 ? "disabled" : ""}>
        <i class="bi bi-chevron-left"></i> Prev
      </button>
      <span>Page ${window.currentCustomerPage} of ${window.totalCustomerPages}</span>
      <button onclick="changeCustomerPage(${window.currentCustomerPage + 1})" ${window.currentCustomerPage === window.totalCustomerPages ? "disabled" : ""}>
        Next <i class="bi bi-chevron-right"></i>
      </button>
    `;
  }

  window.changeCustomerPage = function (page) {
    if (page < 1 || page > window.totalCustomerPages) return;
    fetchCustomerProducts(page);
  };

  // ================= CART =================
  window.addToCart = function (id, sellerid, name, price, image, stock) {
    const existing = window.customerCart.find((i) => i.id === id);

    if (existing) {
      existing.quantity++;
    } else {
      window.customerCart.push({
        id,
        sellerid,
        name,
        price,
        image,
        stock,
        quantity: 1,
      });
    }

    saveCustomerCart();
    showToast(name + " added!", "success");
  };

  function escapeHtml(str) {
    return str?.replace(
      /[&<>]/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
        })[m],
    );
  }

  function showToast(msg, type = "success") {
    Swal.fire({
      title: msg,
      icon: type,
      timer: 1500,
      showConfirmButton: false,
      toast: true,
      position: "top-end",
    });
  }

  function filterCustomerProducts() {
    const searchTerm =
      document.getElementById("productSearch")?.value.toLowerCase() || "";
    const category = document.getElementById("categoryFilter")?.value || "all";
    const priceRange = document.getElementById("priceFilter")?.value || "";
    const sortBy = document.getElementById("sortFilter")?.value || "";

    let filtered = [...window.allCustomerProducts];

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchTerm),
      );
    }

    // Filter by category
    if (category !== "all") {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filter by price
    if (priceRange) {
      if (priceRange === "10000+") {
        filtered = filtered.filter((p) => p.price >= 10000);
      } else {
        const [min, max] = priceRange.split("-").map(Number);
        filtered = filtered.filter((p) => p.price >= min && p.price <= max);
      }
    }

    // Sort
    if (sortBy === "price-asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderCustomerProducts(filtered);
    const wrapper = document.getElementById("productPagination");
    if (wrapper) wrapper.innerHTML = "";
  }

  // ================= INIT =================
  window.initCustomerPage = function () {
    loadCustomerCart();
    fetchCustomerProducts(1);
  };
}
