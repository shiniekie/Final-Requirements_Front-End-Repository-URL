// Prevent multiple execution
if (typeof window.profilePageInitialized === "undefined") {
  window.profilePageInitialized = true;

  let selectedProfileImage = null;

  function loadUserProfile() {
    $.ajax({
      url: `${BASE_URL}/user/profile`,
      type: "GET",
      headers: getHeaders(),
      success: function (res) {
        if (res.user) {
          $("#profileName").text(res.user.name);
          $("#profileRole").text(res.user.role || "Admin");
          $("#pName").val(res.user.name);
          $("#pEmail").val(res.user.email);
          $("#pPhone").val(res.user.phone || "");
          $("#pAddress").val(res.user.address || "");

          // Handle profile photo with full URL
          if (res.user.photo) {
            let imageUrl = res.user.photo;

            // If the URL is relative, prepend BASE_URL
            if (
              imageUrl.startsWith("/uploads/") ||
              imageUrl.startsWith("uploads/")
            ) {
              imageUrl = `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
            } else if (
              !imageUrl.startsWith("http://") &&
              !imageUrl.startsWith("https://")
            ) {
              imageUrl = `${BASE_URL}/${imageUrl}`;
            }

            console.log("Loading image from:", imageUrl);
            updateAvatarWithImage(imageUrl);
          } else if (res.user.profile_pic) {
            // Try alternative field name
            let imageUrl = res.user.profile_pic;
            if (
              !imageUrl.startsWith("http://") &&
              !imageUrl.startsWith("https://")
            ) {
              imageUrl = `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
            }
            updateAvatarWithImage(imageUrl);
          } else {
            updateAvatarInitials();
          }
        }
      },
      error: function (xhr, error) {
        console.log(error);
        console.log("Failed to load profile:", xhr.status);
        // Show fallback initials
        updateAvatarInitials();
      },
    });
  }

  // Update avatar with initials
  window.updateAvatarInitials = function () {
    const name = $("#pName").val() || $("#profileName").text() || "User";
    if (name) {
      const initials = name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      $("#profileAvatar").empty(); // Clear any existing content
      $("#profileAvatar").text(initials);
      $("#profileAvatar").css({
        background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
        padding: "0",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });
    } else {
      $("#profileAvatar").empty();
      $("#profileAvatar").text("U");
    }
  };

  // Update avatar with image
  function updateAvatarWithImage(imageUrl) {
    // Clear text content and set image
    $("#profileAvatar").empty();
    $("#profileAvatar").html(
      `<img src="${imageUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="handleImageError(this)">`,
    );
    $("#profileAvatar").css({
      background: "transparent",
      padding: "0",
      overflow: "hidden",
      display: "block",
    });
  }

  // Handle image loading errors
  window.handleImageError = function (imgElement) {
    console.log("Image failed to load");
    updateAvatarInitials();
  };

  // Handle profile picture selection
  $("#profile_pic").on("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: "Error",
          text: "Please select a valid image file (JPEG, PNG, GIF, or WEBP)",
          icon: "error",
          confirmButtonColor: "#3b82f6",
        });
        $(this).val("");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: "Error",
          text: "Image size should be less than 5MB",
          icon: "error",
          confirmButtonColor: "#3b82f6",
        });
        $(this).val("");
        return;
      }

      // Preview image
      const reader = new FileReader();
      reader.onload = function (e) {
        selectedProfileImage = {
          file: file,
          dataUrl: e.target.result,
        };

        // Show preview
        $("#profileAvatar").empty();
        $("#profileAvatar").html(
          `<img src="${e.target.result}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`,
        );
        $("#profileAvatar").css({
          background: "transparent",
          padding: "0",
          overflow: "hidden",
          display: "block",
        });
      };
      reader.readAsDataURL(file);
    }
  });

  window.saveProfile = function () {
    const profileData = {
      name: $("#pName").val().trim(),
      email: $("#pEmail").val().trim(),
      phone: $("#pPhone").val().trim(),
      address: $("#pAddress").val().trim(),
    };

    // Validation
    if (!profileData.name) {
      Swal.fire({
        title: "Error",
        text: "Please enter your name",
        icon: "error",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    if (!profileData.email) {
      Swal.fire({
        title: "Error",
        text: "Please enter your email address",
        icon: "error",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      Swal.fire({
        title: "Error",
        text: "Please enter a valid email address",
        icon: "error",
        confirmButtonColor: "#3b82f6",
      });
      return;
    }

    Swal.fire({
      title: "Updating Profile...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    updateProfileAPI(profileData);
  };

  function updateProfileAPI(profileData) {
    const formData = new FormData();

    // text fields
    formData.append("name", profileData.name);
    formData.append("email", profileData.email);
    formData.append("phone", profileData.phone);
    formData.append("address", profileData.address);

    // GET FILE DIRECTLY FROM INPUT
    const fileInput = document.getElementById("profile_pic");

    if (fileInput && fileInput.files.length > 0) {
      formData.append("profile_pic", fileInput.files[0]);
    }

    $.ajax({
      url: `${BASE_URL}/user/profile/update`,
      type: "POST",
      headers: getHeaders(true), // Make sure getHeaders(true) returns headers without Content-Type
      data: formData,
      processData: false,
      contentType: false,
      success: function (res) {
        console.log("Update response:", res);

        $("#profileName").text(profileData.name);

        // Update avatar if new image was uploaded
        if (
          fileInput &&
          fileInput.files.length > 0 &&
          res.user &&
          res.user.photo
        ) {
          let imageUrl = res.user.photo;
          if (
            !imageUrl.startsWith("http://") &&
            !imageUrl.startsWith("https://")
          ) {
            imageUrl = `${BASE_URL}/${imageUrl.replace(/^\//, "")}`;
          }
          updateAvatarWithImage(imageUrl);
        } else if (!fileInput.files.length) {
          // Keep existing avatar
          const currentImg = $("#profileAvatar img").attr("src");
          if (currentImg && currentImg !== "undefined") {
            // Image already showing, do nothing
          } else {
            updateAvatarInitials();
          }
        }

        // Update localStorage if needed
        if (res.user) {
          const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
          if (userInfo.user) {
            userInfo.user.name = profileData.name;
            userInfo.user.email = profileData.email;
            userInfo.user.phone = profileData.phone;
            userInfo.user.address = profileData.address;
            if (res.user.photo) userInfo.user.photo = res.user.photo;
            localStorage.setItem("userInfo", JSON.stringify(userInfo));
          }
        }

        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
        });

        // Reset file input and selected image
        $("#profile_pic").val("");
        selectedProfileImage = null;
      },
      error: function (xhr) {
        console.log("Update error:", xhr);
        let errorMsg = "Update failed";
        if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMsg = xhr.responseJSON.message;
        }
        Swal.fire({
          title: "Error",
          text: errorMsg,
          icon: "error",
          confirmButtonColor: "#3b82f6",
        });
      },
    });
  }

  // Open password change modal (your existing code)
  window.openChangePwd = function () {
    Swal.fire({
      title: "Change Password",
      html: `
        <div style="text-align: left;">
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">Current Password</label>
            <input type="password" id="currentPassword" class="form-ctrl" placeholder="Enter current password" style="width: 100%;">
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">New Password</label>
            <input type="password" id="newPassword" class="form-ctrl" placeholder="Enter new password" style="width: 100%;">
          </div>
          <div class="form-group" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-size: 13px; font-weight: 500;">Confirm New Password</label>
            <input type="password" id="confirmPassword" class="form-ctrl" placeholder="Confirm new password" style="width: 100%;">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Update Password",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#64748b",
      preConfirm: () => {
        const currentPwd = document.getElementById("currentPassword").value;
        const newPwd = document.getElementById("newPassword").value;
        const confirmPwd = document.getElementById("confirmPassword").value;

        if (!currentPwd) {
          Swal.showValidationMessage("Please enter your current password");
          return false;
        }

        if (!newPwd) {
          Swal.showValidationMessage("Please enter a new password");
          return false;
        }

        if (newPwd.length < 6) {
          Swal.showValidationMessage("Password must be at least 6 characters");
          return false;
        }

        if (newPwd !== confirmPwd) {
          Swal.showValidationMessage("New passwords do not match");
          return false;
        }

        return { currentPwd, newPwd, confirmPwd };
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Updating Password...",
          text: "Please wait",
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        const data = {
          current_password: result.value.currentPwd,
          new_password: result.value.newPwd,
          new_password_confirmation: result.value.confirmPwd,
        };

        $.ajax({
          url: `${BASE_URL}/user/change-password`,
          type: "POST",
          headers: getHeaders(),
          data: JSON.stringify(data),
          contentType: "application/json",
          success: function (res) {
            console.log(res);
            Swal.fire({
              title: "Success!",
              text: "Your password has been changed successfully",
              icon: "success",
              confirmButtonColor: "#3b82f6",
              timer: 2000,
            });
          },
          error: function (xhr) {
            let errorMsg = "Failed to change password";
            if (xhr.status === 401) {
              errorMsg = "Current password is incorrect";
            } else if (xhr.responseJSON && xhr.responseJSON.message) {
              errorMsg = xhr.responseJSON.message;
            }
            Swal.fire({
              title: "Error",
              text: errorMsg,
              icon: "error",
              confirmButtonColor: "#3b82f6",
            });
          },
        });
      }
    });
  };

  // Initialize profile page
  window.initProfilePage = function () {
    loadUserProfile();
  };
}
