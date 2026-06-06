let selectedRole = "customer";
window.selectRole = function (role) {
  selectedRole = role;
      
 document.querySelectorAll(".role-card").forEach((c) => {
   c.classList.toggle("selected", c.dataset.role === role);
 });
};

function togglePwd(inputId, iconId) {
  const inp = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (inp.type === "password") {
    inp.type = "text";
    icon.className = "bi bi-eye-slash";
  } else {
    inp.type = "password";
    icon.className = "bi bi-eye";
  }
}

function checkStrength(val) {
  const fill = document.getElementById("strengthFill");
  const text = document.getElementById("strengthText");
  if (!val) {
    fill.style.width = "0";
    text.textContent = "Enter a password";
    fill.style.background = "#e5e7eb";
    return;
  }
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { w: "20%", bg: "#ef4444", label: "Too weak" },
    { w: "45%", bg: "#f97316", label: "Weak" },
    { w: "70%", bg: "#eab308", label: "Fair" },
    { w: "100%", bg: "#22c55e", label: "Strong" },
  ];
  const l = levels[score - 1] || levels[0];
  fill.style.width = l.w;
  fill.style.background = l.bg;
  text.textContent = l.label;
  text.style.color = l.bg;
}

function showFieldError(id, show) {
  const err = document.getElementById("err-" + id);
  const inp = document.getElementById(id);
  if (err) err.style.display = show ? "block" : "none";
  if (inp) inp.classList.toggle("invalid", show);
}

function doRegister() {
  const fName = document.getElementById("fName").value.trim();
  const lName = document.getElementById("lName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();
  const pwd = document.getElementById("regPwd").value;
  const pwd2 = document.getElementById("regPwd2").value;

  const full_name = `${fName} ${lName}`;
  // Reset errors
  ["fName", "lName", "regEmail", "phone", "regPwd", "regPwd2"].forEach((id) =>
    showFieldError(id, false),
  );
  document.getElementById("errorMsg").style.display = "none";
  document.getElementById("successMsg").style.display = "none";

  let hasError = false;
  if (!fName) {
    showFieldError("fName", true);
    hasError = true;
  }
  if (!lName) {
    showFieldError("lName", true);
    hasError = true;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    showFieldError("regEmail", true);
    hasError = true;
  }
  if (!phone) {
    showFieldError("phone", true);
    hasError = true;
  }
  if(phone.length < 11 || phone.length > 11){
    showFieldError("phoneLength", true);
    hasError = true;
  }
  if (!pwd || pwd.length < 8) {
    showFieldError("regPwd", true);
    hasError = true;
  }
  if (pwd !== pwd2) {
    showFieldError("regPwd2", true);
    hasError = true;
  }

  if (hasError) {
    document.getElementById("errorText").textContent =
      "Please fix the highlighted errors.";
    document.getElementById("errorMsg").style.display = "flex";
    return;
  }

  // Success
  $.ajax({
    url: `${BASE_URL}/register`,
    type: "POST",
    data: JSON.stringify({
      name: full_name,
      email: email,
      phone: phone,
      address: address,
      password: pwd2,
      role: selectedRole,
    }),
    contentType: "application/json",
    dataType: "json",
    beforeSend: function () {
      $("#btn-register").text("Processing...");
    },
    success: function (res) {
      if (res.success) {
        alert(
          "Registrattion successfull. To activate your account, please check your email.",
        );
        document.getElementById("successMsg").style.display = "flex";
        setTimeout(() => {
          window.location.href = "index.html";
        }, 2200);
      }
    },
    error: function (xhr, status, error) {
      $("#btn-register").text("Create Account");
      if (xhr.status === 422) {
        const errors = xhr.responseJSON.errors;
        if (errors.email) {
          alert(
            "This email is already registered. Please use a different email.",
          );
          $("#email").addClass("is-invalid");
          $("#emailError").text(errors.email[0]);
        }
      } else if (xhr.status === 500) {
        alert("Server error. Please try again later.");
      } else {
        alert(
          xhr.responseJSON?.message || "Registration failed. Please try again.",
        );
      }
    },
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doRegister();
});
