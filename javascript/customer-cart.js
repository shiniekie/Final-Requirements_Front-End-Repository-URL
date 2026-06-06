    if (typeof window.cartPageInitializedWithSelection === "undefined") {
        window.cartPageInitializedWithSelection = true;

        // Global cart items array
        window.cartItems = [];
        // Track which items are selected (by index)
        window.selectedIndices = new Set();

        // ----- Helper Functions -----
        function loadCart() {
            const savedCart = localStorage.getItem("customer_cart");
            if (savedCart) {
                window.cartItems = JSON.parse(savedCart);
            } else {
                window.cartItems = [];
            }
            // reset selected indices when loading cart (avoid mismatched indexes)
            window.selectedIndices.clear();
            renderCart();
        }

        function saveCart() {
            localStorage.setItem("customer_cart", JSON.stringify(window.cartItems));
            updateCartCount();
        }

        function updateCartCount() {
            const totalItems = window.cartItems.reduce((s, i) => s + i.quantity, 0);
            document.querySelectorAll("#cartCount").forEach((b) => {
                if (b) {
                    b.style.display = totalItems > 0 ? "inline-block" : "none";
                    b.textContent = totalItems;
                }
            });
            // update header count in cart page
            const countSpan = document.getElementById("cartItemCount");
            if (countSpan) {
                countSpan.textContent = `${totalItems} ${totalItems === 1 ? "item" : "items"}`;
            }
        }

        // toggle selection for a specific item index
        window.toggleSelectItem = function (index, checked) {
            if (checked) {
                window.selectedIndices.add(index);
            } else {
                window.selectedIndices.delete(index);
            }
            updateSelectAllCheckboxState();
            updateSummaryBasedOnSelection();
            updateCheckoutButtonText();
        };

        // select / deselect all
        function selectAllItems(selectAll) {
            if (selectAll) {
                for (let i = 0; i < window.cartItems.length; i++) {
                    window.selectedIndices.add(i);
                }
            } else {
                window.selectedIndices.clear();
            }
            renderCart(); // re-render to reflect checkbox states
            updateSelectAllCheckboxState();
            updateSummaryBasedOnSelection();
            updateCheckoutButtonText();
        }

        function updateSelectAllCheckboxState() {
            const selectAllChk = document.getElementById("selectAllCheckbox");
            if (!selectAllChk) return;
            const totalItems = window.cartItems.length;
            const selectedCount = window.selectedIndices.size;
            if (totalItems === 0) {
                selectAllChk.checked = false;
                selectAllChk.indeterminate = false;
            } else if (selectedCount === totalItems) {
                selectAllChk.checked = true;
                selectAllChk.indeterminate = false;
            } else if (selectedCount > 0 && selectedCount < totalItems) {
                selectAllChk.checked = false;
                selectAllChk.indeterminate = true;
            } else {
                selectAllChk.checked = false;
                selectAllChk.indeterminate = false;
            }
        }

        function updateCheckoutButtonText() {
            const selectedCount = window.selectedIndices.size;
            const btnSpan = document.getElementById("selectedCount");
            if (btnSpan) btnSpan.textContent = selectedCount;
            const checkoutBtn = document.getElementById("checkoutBtn");
            if (checkoutBtn) {
                if (selectedCount === 0) {
                    checkoutBtn.disabled = true;
                } else {
                    checkoutBtn.disabled = false;
                }
            }
            const badge = document.getElementById("selectedItemsBadge");
            if (badge) {
                if (selectedCount === 0) badge.textContent = "No items selected";
                else if (selectedCount === 1) badge.textContent = "1 item selected";
                else badge.textContent = `${selectedCount} items selected`;
            }
        }

        // Calculate summary ONLY for selected items
        function getSelectedCartItems() {
            const selected = [];
            for (let idx of window.selectedIndices) {
                if (window.cartItems[idx]) {
                    selected.push({ ...window.cartItems[idx], originalIndex: idx });
                }
            }
            return selected;
        }

        function updateSummaryBasedOnSelection() {
            const selectedItems = getSelectedCartItems();
            const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shipping = (subtotal > 0) ? (subtotal >= 1000 ? 0 : 10) : 0;
            const vat = subtotal * 0.12;
            const total = subtotal + shipping + vat;

            document.getElementById("cartSubtotal").innerHTML = `₱${subtotal.toFixed(2)}`;
            document.getElementById("cartShipping").innerHTML = subtotal > 0 ? (shipping ? `₱${shipping.toFixed(2)}` : "Free") : "₱0";
            document.getElementById("cartVAT").innerHTML = `₱${vat.toFixed(2)}`;
            document.getElementById("cartTotal").innerHTML = `₱${total.toFixed(2)}`;
        }

        // Quantity update must preserve selection (selectedIndices may shift after re-render? but we render fresh and update selectedIndices)
        window.updateQuantity = function (index, delta) {
            if (window.cartItems[index]) {
                const stock = window.cartItems[index].stock || 999;
                const newQty = window.cartItems[index].quantity + delta;
                if (newQty >= 1 && newQty <= stock) {
                    window.cartItems[index].quantity = newQty;
                    saveCart();
                    renderCart();  // re-render will maintain selection logic via mapping after render
                } else {
                    showToast("Stock limit reached", "warning");
                }
            }
        };

        window.removeItem = function (index) {
            // before removal, check if removed index was selected
            const wasSelected = window.selectedIndices.has(index);
            window.cartItems.splice(index, 1);
            // rebuild selectedIndices set: indices shift after removal
            const newSelected = new Set();
            for (let oldIdx of window.selectedIndices) {
                if (oldIdx === index) continue;
                if (oldIdx > index) newSelected.add(oldIdx - 1);
                else newSelected.add(oldIdx);
            }
            window.selectedIndices = newSelected;
            saveCart();
            renderCart();
            showToast("Item removed from cart", "info");
        };

        function renderCart() {
            const container = document.getElementById("cartItems");
            const countSpan = document.getElementById("cartItemCount");

            if (!container) return;

            if (window.cartItems.length === 0) {
                container.innerHTML = `
                    <div class="empty-cart">
                        <div class="empty-cart-icon"><i class="bi bi-cart-x"></i></div>
                        <h5>Your cart is empty</h5>
                        <p>Looks like you haven't added any items yet</p>
                        <button onclick="navigate('products')">Browse Products</button>
                    </div>
                `;
                if (countSpan) countSpan.textContent = "0 items";
                window.selectedIndices.clear();
                updateSummaryBasedOnSelection();
                updateSelectAllCheckboxState();
                updateCheckoutButtonText();
                return;
            }

            // Re-validate selected indices (remove any that are out of bounds)
            const validSelected = new Set();
            for (let idx of window.selectedIndices) {
                if (idx >= 0 && idx < window.cartItems.length) validSelected.add(idx);
            }
            window.selectedIndices = validSelected;

            let html = '';
            window.cartItems.forEach((item, idx) => {
                const total = item.price * item.quantity;
                const imageUrl = item.image || "https://placehold.co/400x300?text=No+Image";
                const isChecked = window.selectedIndices.has(idx) ? 'checked' : '';
                html += `
                    <div class="cart-item">
                        <div class="cart-item-select">
                            <input type="checkbox" class="item-select-checkbox" data-index="${idx}" ${isChecked} onchange="toggleSelectItem(${idx}, this.checked)">
                        </div>
                        <div class="cart-item-info">
                            <img src="${imageUrl}" class="cart-item-image" alt="${escapeHtml(item.name)}" onerror="this.src='https://placehold.co/400x300?text=No+Image'">
                            <div class="cart-item-details">
                                <div class="cart-item-name">${escapeHtml(item.name)}</div>
                                <div class="cart-item-price">₱${parseFloat(item.price).toFixed(2)} each</div>
                            </div>
                        </div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" onclick="updateQuantity(${idx}, -1)">−</button>
                            <span class="quantity-value">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${idx}, 1)">+</button>
                        </div>
                        <div class="cart-item-total">₱${total.toFixed(2)}</div>
                        <button class="cart-item-remove" onclick="removeItem(${idx})">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                `;
            });
            container.innerHTML = html;

            const totalItems = window.cartItems.reduce((s, i) => s + i.quantity, 0);
            if (countSpan) countSpan.textContent = `${totalItems} ${totalItems === 1 ? "item" : "items"}`;
            updateSelectAllCheckboxState();
            updateSummaryBasedOnSelection();
            updateCheckoutButtonText();
        }

        // proceed to checkout ONLY for selected items
        window.proceedToCheckoutSelected = function () {
            if (window.selectedIndices.size === 0) {
                showToast("Please select at least one item to checkout", "warning");
                return;
            }

            const selectedItems = getSelectedCartItems();
            if (selectedItems.length === 0) {
                showToast("No valid items selected", "warning");
                return;
            }

            // load saved contact info
            const savedContact = JSON.parse(localStorage.getItem("token") || "{}");

            Swal.fire({
                html: `
                    <div style="padding: 5px 0; text-align: left;">
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" id="fullName" placeholder="Enter your full name" value="${escapeHtml(savedContact.user?.name || "")}">
                        </div>
                        <div class="form-group">
                            <label>Email Address *</label>
                            <input type="email" id="email" placeholder="your@email.com" value="${escapeHtml(savedContact.user?.email || "")}">
                        </div>
                        <div class="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" id="phone" placeholder="09123456789" value="${escapeHtml(savedContact.user?.phone || "")}">
                        </div>
                        <div class="form-group">
                            <label>Complete Address *</label>
                            <textarea id="complete_address" rows="2" placeholder="House/Block/Lot/Street, Barangay, City/Municipality, Province">${escapeHtml(savedContact.user?.address || "")}</textarea>
                        </div>
                    </div>
                `,
                width: "500px",
                showCancelButton: true,
                confirmButtonText: "Place Order",
                cancelButtonText: "Cancel",
                confirmButtonColor: "#3b82f6",
                preConfirm: () => {
                    const fullName = document.getElementById("fullName")?.value.trim();
                    const email = document.getElementById("email")?.value.trim();
                    const phone = document.getElementById("phone")?.value.trim();
                    const address = document.getElementById("complete_address")?.value.trim();
                    if (!fullName) { Swal.showValidationMessage("Full name required"); return false; }
                    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Swal.showValidationMessage("Valid email required"); return false; }
                    if (!phone || phone.length < 11 || phone.length > 11) { Swal.showValidationMessage("Valid phone required"); return false; }
                    if (!address) { Swal.showValidationMessage("Address required"); return false; }
                    return { name: fullName, email, phone, address };
                }
            }).then((result) => {
                if (result.isConfirmed && result.value) {
                    const contact = result.value;
                    // calc totals based on selected items only
                    const subtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
                    const shipping = subtotal >= 1000 ? 0 : 10;
                    const vat = subtotal * 0.12;
                    const total = subtotal + shipping + vat;

                    const orderItems = selectedItems.map(item => ({
                        product_id: item.id,
                        seller_id: item.sellerid,
                        product_name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        subtotal: item.price * item.quantity,
                    }));

                    const orderData = {
                        order_number: "ORD-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
                        customer_name: contact.name,
                        customer_email: contact.email,
                        customer_phone: contact.phone,
                        delivery_address: contact.address,
                        items: orderItems,
                        subtotal: subtotal,
                        shipping_fee: shipping,
                        vat: vat,
                        total: total,
                        status: "pending",
                    };

                    Swal.fire({ title: "Processing...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                    console.log(JSON.stringify(orderData))
                    $.ajax({
                        url: `${BASE_URL}/place_orders`,
                        method: "POST",
                        data: JSON.stringify(orderData),
                        contentType: "application/json",
                        headers: getHeaders(),
                        success: function (response) {
                            console.log(response)
                            const indicesToRemove = Array.from(window.selectedIndices).sort((a,b)=>b-a);
                            for (let idx of indicesToRemove) {
                                window.cartItems.splice(idx, 1);
                            }
                            window.selectedIndices.clear();
                            saveCart();
                            renderCart();
                            Swal.close();
                            Swal.fire({
                                title: "✨ Order Confirmed!",
                                html: `<div style="text-align:center"><strong>${orderData.order_number}</strong><br>Total: ₱${total.toFixed(2)}<br>Thank you!</div>`,
                                icon: "success",
                                confirmButtonText: "View Orders",
                                showCancelButton: true,
                                cancelButtonText: "Continue Shopping"
                            }).then((res) => {
                                if (res.isConfirmed) navigate("orders");
                                else navigate("products");
                            });
                        },
                        error: function (err) {
                            console.log(err);
                            Swal.close();
                            Swal.fire("Error", err.responseJSON?.message || "Order failed", "error");
                        }
                    });
                }
            });
        };

        function showToast(msg, type) {
            Swal.fire({ title: msg, icon: type, toast: true, timer: 1500, position: "top-end", showConfirmButton: false });
        }

        function escapeHtml(str) { return str?.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]); }

        // global select all handler
        document.addEventListener("change", function(e) {
            if (e.target && e.target.id === "selectAllCheckbox") {
                selectAllItems(e.target.checked);
            }
        });

        window.initCartPage = function () {
            loadCart();
            updateCartCount();
        };

        // initial load when page ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => window.initCartPage());
        } else {
            window.initCartPage();
        }
    }
