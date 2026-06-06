const BASE_URL =
  "https://purple-bison-564413.hostingersite.com/backend/public/api";

const userInfo = JSON.parse(localStorage.getItem("token"));
// if(userInfo.user.name){
//   $("#_customerName").html(userInfo.user.name);
// }

function checkAuth() {
  const token = getToken();

  if (!token) {
    location.href = "https://ecommerce-rosy-iota.vercel.app";
    return false;
  }
  return true;
}

const getHeaders = (isFormData = false) => {
  const token = getToken();
  let headers = {
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
};

// Get user role from token
function getUserRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const data = JSON.parse(token);
    if (data.user && data.user.role) {
      return data.user.role;
    }
    if (data.role) return data.role;
  } catch (e) {
    console.error("Error parsing token:", e);
  }
  return null;
}

// Get token
function getToken() {
  const tokenData = localStorage.getItem("token");
  try {
    const parsed = JSON.parse(tokenData);
    return parsed.token || parsed;
  } catch (e) {
    return tokenData;
  }
}

// Role-based navigation
function redirectBaseRole() {
  const role = getUserRole();
  switch (role) {
    case "seller":
      return "https://ecommerce-rosy-iota.vercel.app/seller/";
    case "admin":
      return "https://ecommerce-rosy-iota.vercel.app/admin/";
    case "customer":
      return "https://ecommerce-rosy-iota.vercel.app/customer/";
    default:
      return "https://ecommerce-rosy-iota.vercel.app";
  }
}

// Update sidebar visibility based on role
function updateSidebarForRole() {
  const role = getUserRole();

  if (role !== "seller") {
    $(".nav-item[data-page='seller-products']").hide();
    $(".nav-item[data-page='seller-orders']").hide();
    $(".nav-item[data-page='seller-analytics']").hide();
  }

  if (role !== "admin") {
    $(".nav-item[data-page='users']").hide();
    $(".nav-item[data-page='transactions']").hide();
  }
}

function loadPage(page) {
  const role = getUserRole();

  const pagePath = `/${role}/${page}.html`;

  $("#app").load(pagePath, function (response, status) {
    if (status === "error") {
      console.error("Error loading:", pagePath);
      $("#app").html("<h3>Page not found</h3>");
    }
    if (role === "customer") {
      initCustomerPage();
      initCartPage();
      initTransactionsPage();
      initDashboardPage();
      initProfilePage();
    }
    if (role === "seller") {
      initProfilePage();
      initSellerDashboard();
      initSellerProducts();
      initSellerOrders();
      initDemandProducts();
    }
    if (role === "admin") {
      initProfilePage();
      initAdminDashboard();
      initAdminUsers();
    }
    initNotifications();
  });

  $(".nav-item").removeClass("active");
  $(`.nav-item[data-page="${page}"]`).addClass("active");
  $(window).scrollTop(0);
}

function navigate(page) {
  loadPage(page);
  $("#sidebar").removeClass("open");
  $("#sidebarOverlay").removeClass("show");
}

function toggleSidebar() {
  $("#sidebar").toggleClass("open");
  $("#sidebarOverlay").toggleClass("show");
}

function Logout() {
  if (confirm("Are you sure you want to logout?")) {
    const token = getToken();

    $.ajax({
      url: `${BASE_URL}/logout`,
      type: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: JSON.stringify({}),
      success: function (res) {
        localStorage.removeItem("token");
        showAlert("success", "Logged out successfully!");
        setTimeout(() => {
          window.location.href = "https://ecommerce-rosy-iota.vercel.app";
        }, 1000);
      },
      error: function (xhr) {
        localStorage.clear();
        showAlert("warning", "Logged out locally.");
        setTimeout(() => {
          window.location.href = "../index.html";
        }, 1000);
      },
    });
  }
}

function showAlert(type, msg) {
  const toast = $(
    `<div class="toast-item toast-${type === "error" ? "error" : "success"}">${msg}</div>`,
  );
  $("#toastWrap").append(toast);
  setTimeout(() => toast.remove(), 3000);
}

function toast(msg, type) {
  showAlert(type, msg);
}

function showModal(id) {
  $(`#${id}`).addClass("show");
}

function closeModal(id) {
  $(`#${id}`).removeClass("show");
}

function updateAvatarInitials() {
  const name = $("#pName").val() || "User";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  $("#avatarInitials, #profileAvatar").text(initials);
}

function saveProfile() {
  const name = $("#pName").val().trim();
  if (!name) {
    toast("Name cannot be empty.", "error");
    return;
  }
  updateAvatarInitials();
  $("#profileName").text(name);
  toast("Profile saved successfully!", "success");
}

function openChangePwd() {
  showModal("changePwdModal");
}

function submitChangePwd() {
  const np = $("#cpNew").val();
  const cp = $("#cpConfirm").val();
  if (!np || np !== cp) {
    toast("Passwords do not match.", "error");
    return;
  }
  closeModal("changePwdModal");
  toast("Password updated successfully!", "success");
}

function submitForgotPwd() {
  const e = $("#fpEmail").val().trim();
  if (!e) {
    toast("Please enter your email.", "error");
    return;
  }
  closeModal("forgotPwdModal");
  toast(`Reset link sent to ${e}`, "success");
}

window.toggleNotifPanel = function () {
  const notifPanel = document.getElementById("notifPanel");
  if (notifPanel) {
    if (notifPanel.style.display === "none" || !notifPanel.style.display) {
      notifPanel.style.display = "block";
    } else {
      notifPanel.style.display = "none";
    }
  } else {
    Swal.fire({
      title: "Notifications",
      text: "Coming soon!",
      icon: "info",
      timer: 2000,
    });
  }
};

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";

  interval = Math.floor(seconds / 3600);
  if (interval === 1) return interval + " hour ago";
  if (interval > 1) return interval + " hours ago";

  interval = Math.floor(seconds / 60);
  if (interval === 1) return interval + " minute ago";
  if (interval > 1) return interval + " minutes ago";

  return Math.floor(seconds) + " seconds ago";
}

function parseUTCDate(dateString) {
  return new Date(dateString.replace(" ", "T") + "Z");
}

$(document).ready(function () {
  $(document).on("click", ".modal-overlay", function (e) {
    if (e.target === this) closeModal(this.id);
  });

  $(document).on("click", function (e) {
    if (
      !$(e.target).closest("#notifPanel").length &&
      !$(e.target).closest(".notif-btn").length
    ) {
      $("#notifPanel").removeClass("show");
    }
  });
});
