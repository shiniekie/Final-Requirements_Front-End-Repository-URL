function togglePwd() {
  const inp = document.getElementById("password");
  const icon = document.getElementById("eyeIcon");
  if (inp.type === "password") {
    inp.type = "text";
    icon.className = "bi bi-eye-slash";
  } else {
    inp.type = "password";
    icon.className = "bi bi-eye";
  }
}

function fillDemo(email, pwd) {
  document.getElementById("email").value = email;
  document.getElementById("password").value = pwd;
  document.getElementById("email").focus();
}

function doLogin() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showAlert("error", "Please enter your email and password.");
    return;
  }

  $.ajax({
    url: `${BASE_URL}/login`,
    type: "POST",
    data: {
      fcm_token: localStorage.getItem("fcm_token") ?? "",
      email: email,
      password: password,
    },
    beforeSend: function () {
      $("#signIn").text("Processing...");
    },
    success: function (res) {
      localStorage.setItem("token", JSON.stringify(res));
      $("#signIn").text("Redirecting...");
      setTimeout(() => {
        window.location.href = redirectBaseRole();
      }, 1800);
    },
    error: function (xhr, status, error) {
      $("#signIn").text("Sign In");
      console.error("Logout error:", xhr.responseJSON);
      alert("An error occured! Invalid credentials or account is not verified");
    },
  });
}

function showForgot(e) {
  e.preventDefault();
  document.getElementById("forgotOverlay").style.display = "flex";
}
function closeForgot() {
  document.getElementById("forgotOverlay").style.display = "none";
}
function sendReset() {
  const e = document.getElementById("fpEmail").value.trim();
  if (!e) return;

  $.ajax({
    url: `${BASE_URL}/forgot-password`,
    type: "POST",
    data: {
      email: e,
    },
    beforeSend: function () {
      $("#send-reset-link").text("Processing...");
    },
    success: function (res) {
      $("#send-reset-link").text("Send Link");
      console.log(res);
      closeForgot();
      alert(`Password reset link sent to <strong>${e}</strong>`);
    },
    error: function (xhr, status, error) {
      $("#send-reset-link").text("Send Link");
      console.log("Logout error:", xhr.responseJSON);
      alert("An error occured!");
    },
  });
}

// Enter key support
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
