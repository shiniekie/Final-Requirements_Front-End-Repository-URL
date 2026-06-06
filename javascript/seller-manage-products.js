// seller-manage-products.js - Prevent multiple execution
if (typeof window.sellerProductsInitialized === "undefined") {
  window.sellerProductsInitialized = true;

  let currentPage = 1;
  let totalPages = 1;
  let modalInstance = null;
  let imagesToDelete = [];

  // ======================== PRODUCT CRUD ========================
  function fetchProducts(page = 1) {
    const grid = document.getElementById("productGrid");
    const spinner = document.getElementById("loadingSpinner");
    if (grid) grid.innerHTML = "";
    if (spinner) spinner.style.display = "block";

    $.ajax({
      url: `${BASE_URL}/products`,
      type: "GET",
      data: { page: page },
      headers: getHeaders(),
      success: function (result) {
        let products = [];
        let pagination = {};

        // Handle different response formats
        if (result.data && Array.isArray(result.data)) {
          products = result.data;
          pagination = {
            current_page: result.current_page || page,
            last_page: result.last_page || 1,
            total: result.total || 0,
            per_page: result.per_page || 12,
          };
        } else if (Array.isArray(result)) {
          products = result;
          pagination = {
            current_page: 1,
            last_page: 1,
            total: products.length,
            per_page: products.length,
          };
        } else if (result.products && Array.isArray(result.products)) {
          products = result.products;
          pagination = {
            current_page: result.current_page || page,
            last_page: result.last_page || 1,
            total: result.total || products.length,
            per_page: result.per_page || 12,
          };
        } else {
          products = [];
          pagination = {
            current_page: 1,
            last_page: 1,
            total: 0,
            per_page: 12,
          };
        }

        totalPages = pagination.last_page;
        currentPage = pagination.current_page;
        renderProducts(products);
        renderPagination(pagination);
      },
      error: function (xhr, status, error) {
        console.error("Error fetching products:", error);
        if (xhr.status === 401) {
          logout();
          return;
        }
        Swal.fire(
          "Error",
          "Could not load products. Make sure API is running.",
          "error",
        );
        if (grid) {
          grid.innerHTML = `<div class="col-12 text-center text-muted">Failed to load products. <button class="btn btn-link" onclick="window.fetchProducts(1)">Retry</button></div>`;
        }
      },
      complete: function () {
        if (spinner) spinner.style.display = "none";
      },
    });
  }

  function renderProducts(products) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;

    if (!products.length) {
      grid.innerHTML = `<div class="col-12 text-center py-5"><i class="fas fa-box-open fa-3x text-muted mb-3"></i><p class="lead">No products found. Click "Add New Product" to start.</p></div>`;
      return;
    }

    grid.innerHTML = products
      .map((product) => {
        let coverImg = "https://placehold.co/400x300?text=No+Image";
        if (product.images && product.images.length > 0) {
          coverImg = product.images[0];
        }
        const stockBadge =
          product.stock > 0
            ? `<span class="badge bg-success stock-badge"><i class="fas fa-check-circle"></i> In Stock (${product.stock})</span>`
            : `<span class="badge bg-danger stock-badge"><i class="fas fa-exclamation-circle"></i> Out of Stock</span>`;
        return `
          <div class="col-md-6 col-lg-3">
            <div class="card product-card h-100 shadow-sm">
              <div style="position: relative;">
                <img src="${coverImg}" class="card-img-top product-img" alt="${escapeHtml(product.name)}" onerror="this.src='https://placehold.co/400x300?text=Image+Error'">
                <span class="badge-category">${escapeHtml(product.category)}</span>
              </div>
              <div class="card-body">
                <h5 class="card-title fw-bold">${escapeHtml(product.name)}</h5>
                <p class="card-text text-muted small">${escapeHtml(product.description?.substring(0, 80) || "No description")}</p>
                <div class="d-flex justify-content-between align-items-center mt-2">
                  <span class="price-tag">₱${parseFloat(product.price).toFixed(2)}</span>
                  ${stockBadge}
                </div>
              </div>
              <div class="card-footer bg-transparent border-0 pb-3">
                <button class="btn btn-sm btn-outline-primary" onclick="window.editProduct(${product.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-sm btn-outline-danger" onclick="window.deleteProduct(${product.id})"><i class="fas fa-trash-alt"></i> Delete</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderPagination(pagination) {
    const wrapper = document.getElementById("paginationWrapper");
    if (!wrapper) return;

    if (totalPages <= 1) {
      wrapper.innerHTML = "";
      return;
    }

    let pagesHtml = `<ul class="pagination pagination-custom">`;
    pagesHtml += `<li class="page-item ${currentPage === 1 ? "disabled" : ""}">
      <a class="page-link" href="#" onclick="window.changePage(${currentPage - 1});return false;">« Prev</a>
    </li>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) {
      pagesHtml += `<li class="page-item ${i === currentPage ? "active" : ""}">
        <a class="page-link" href="#" onclick="window.changePage(${i});return false;">${i}</a>
      </li>`;
    }

    pagesHtml += `<li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
      <a class="page-link" href="#" onclick="window.changePage(${currentPage + 1});return false;">Next »</a>
    </li>`;
    pagesHtml += `</ul>`;
    wrapper.innerHTML = pagesHtml;
  }

  window.changePage = function (page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    fetchProducts(currentPage);
  };

  // Form submission handler for both add and edit
  $(document).on("submit", "#productForm", function (e) {
    e.preventDefault();
    e.stopPropagation();

    const productId = document.getElementById("productId")?.value;
    const name = document.getElementById("productName")?.value.trim();
    const category = document.getElementById("productCategory")?.value;
    const price = document.getElementById("productPrice")?.value;
    const stock = document.getElementById("productStock")?.value;
    const description = document.getElementById("productDescription")?.value;

    // Validate required fields
    if (!name || !category || !price || !stock) {
      Swal.fire(
        "Validation Error",
        "Please fill all required fields (*)",
        "warning",
      );
      return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("price", price);
    formData.append("stock", stock);
    formData.append("description", description);

    const imageInput = document.getElementById("productImages");
    if (imageInput && imageInput.files.length > 0) {
      for (let i = 0; i < imageInput.files.length; i++) {
        formData.append("images[]", imageInput.files[i]);
      }
    }

    let url = `${BASE_URL}/products`;
    let method = "POST";

    // If editing existing product
    if (productId) {
      url = `${BASE_URL}/products/${productId}`;
      method = "POST";
      formData.append("_method", "PUT");

      // Send delete_images as array properly
      if (imagesToDelete.length > 0) {
        imagesToDelete.forEach((imagePath, index) => {
          formData.append(`delete_images[${index}]`, imagePath);
        });
      }
    }

    // Show loading indicator
    Swal.fire({
      title: "Saving...",
      text: "Please wait",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    $.ajax({
      url: url,
      type: method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      data: formData,
      contentType: false,
      processData: false,
      success: function (response) {
        Swal.close();
        Swal.fire({
          title: "Success!",
          text: productId
            ? "Product updated successfully"
            : "Product added successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("productModal"),
        );
        if (modal) modal.hide();
        resetModalForm();

        // Refresh products list
        fetchProducts(currentPage);
      },
      error: function (xhr) {
        Swal.close();
        console.error("Error response:", xhr.responseText);

        if (xhr.status === 401) {
          Swal.fire(
            "Error",
            "Session expired. Please login again.",
            "error",
          ).then(() => {
            logout();
          });
          return;
        }

        if (xhr.status === 422) {
          let errMsg = "Validation failed:\n";
          if (xhr.responseJSON && xhr.responseJSON.errors) {
            const errors = xhr.responseJSON.errors;
            for (const field in errors) {
              errMsg += `- ${field}: ${errors[field].join(", ")}\n`;
            }
          }
          Swal.fire("Validation Error", errMsg, "error");
          return;
        }

        let errMsg = "Error saving product!";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errMsg = xhr.responseJSON.message;
        }
        Swal.fire("Error", errMsg, "error");
      },
    });
  });

  window.deleteProduct = function (productId) {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (!result.isConfirmed) return;

      $.ajax({
        url: `${BASE_URL}/products/${productId}`,
        type: "DELETE",
        headers: getHeaders(),
        success: function (data) {
          Swal.fire("Deleted!", "Product has been removed.", "success");
          fetchProducts(currentPage);
        },
        error: function (xhr, status, error) {
          if (xhr.status === 401) {
            logout();
            return;
          }
          let errMsg = "Delete failed";
          if (xhr.responseJSON && xhr.responseJSON.message) {
            errMsg = xhr.responseJSON.message;
          }
          Swal.fire("Error", errMsg, "error");
          console.error("Error deleting product:", error);
        },
      });
    });
  };

  window.editProduct = function (productId) {
    resetModalForm();

    $.ajax({
      url: `${BASE_URL}/products/${productId}`,
      type: "GET",
      headers: getHeaders(),
      success: function (product) {
        const prodData = product.data || product;

        document.getElementById("productId").value = prodData.id;
        document.getElementById("productName").value = prodData.name;
        document.getElementById("productCategory").value = prodData.category;
        document.getElementById("productPrice").value = prodData.price;
        document.getElementById("productStock").value = prodData.stock;
        document.getElementById("productDescription").value =
          prodData.description || "";
        document.getElementById("productModalTitle").innerText = "Edit Product";

        const existingContainer = document.getElementById("existingImages");
        if (existingContainer) {
          existingContainer.innerHTML = "";
          imagesToDelete = [];

          if (prodData.images && prodData.images.length) {
            prodData.images.forEach((imgUrl) => {
              const imgDiv = document.createElement("div");
              imgDiv.className = "existing-img-item";
              imgDiv.setAttribute("data-img-url", imgUrl);
              imgDiv.innerHTML = `
                <img src="${imgUrl}" alt="product image">
                <span class="remove-existing-img" onclick="window.markImageForDelete(this, '${imgUrl}')">&times;</span>
              `;
              existingContainer.appendChild(imgDiv);
            });
          } else {
            existingContainer.innerHTML =
              '<small class="text-muted">No existing images</small>';
          }
        }

        document.getElementById("newImagePreview").innerHTML = "";
        document.getElementById("productImages").value = "";

        const modalEl = document.getElementById("productModal");
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      },
      error: function (xhr, status, error) {
        if (xhr.status === 401) {
          logout();
          return;
        }
        Swal.fire("Error", "Failed to load product details", "error");
        console.error("Error fetching product:", error);
      },
    });
  };

  window.markImageForDelete = function (element, imageUrl) {
    const parent = element.parentElement;
    imagesToDelete.push(imageUrl);
    if (parent) parent.remove();
  };

  // Setup image preview listener
  $(document).ready(function () {
    // Image preview handler
    $(document).on("change", "#productImages", function (e) {
      const previewDiv = document.getElementById("newImagePreview");
      if (!previewDiv) return;

      previewDiv.innerHTML = "";
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
          const imgContainer = document.createElement("div");
          imgContainer.className = "image-preview";
          imgContainer.innerHTML = `<img src="${ev.target.result}" alt="preview"><i class="fas fa-times-circle text-danger" style="position:absolute; top:-8px; right:-8px; cursor:pointer; background:white; border-radius:50%" onclick="this.parentElement.remove()"></i>`;
          previewDiv.appendChild(imgContainer);
        };
        reader.readAsDataURL(file);
      });
    });
  });

  window.openAddProductModal = function () {
    resetModalForm();
    document.getElementById("productModalTitle").innerText = "Add Product";
    document.getElementById("existingImages").innerHTML = "";
    document.getElementById("newImagePreview").innerHTML = "";
    imagesToDelete = [];

    const modalEl = document.getElementById("productModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  };

  function resetModalForm() {
    const productForm = document.getElementById("productForm");
    if (productForm) productForm.reset();

    const productId = document.getElementById("productId");
    if (productId) productId.value = "";

    const existingImages = document.getElementById("existingImages");
    if (existingImages) existingImages.innerHTML = "";

    const newImagePreview = document.getElementById("newImagePreview");
    if (newImagePreview) newImagePreview.innerHTML = "";

    imagesToDelete = [];
  }

  function closeModal() {
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("productModal"),
    );
    if (modal) modal.hide();
    resetModalForm();
  }

  function logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user_name");
    window.location.href = "/frontend/index.html";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
      if (m === "&") return "&amp;";
      if (m === "<") return "&lt;";
      if (m === ">") return "&gt;";
      return m;
    });
  }

  // Expose global functions
  window.fetchProducts = fetchProducts;
  window.openAddProductModal = window.openAddProductModal;
  window.editProduct = window.editProduct;
  window.deleteProduct = window.deleteProduct;
  window.changePage = window.changePage;
  window.markImageForDelete = window.markImageForDelete;

  // INIT FUNCTION
  window.initSellerProducts = function (forceReload = false) {
    if (forceReload) {
      currentPage = 1;
      totalPages = 1;
      imagesToDelete = [];
    }
    fetchProducts(currentPage);
  };
}
