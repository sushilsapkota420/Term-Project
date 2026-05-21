// public/js/main.js
// ------------------------------------------------------------
// This is the small browser-side JavaScript file.
// The website works mostly with regular HTML forms because that is
// easier to understand for a beginner project.
//
// We only use JavaScript for small user-experience improvements.
// ------------------------------------------------------------

// Wait until the page is fully loaded before looking for buttons.
document.addEventListener("DOMContentLoaded", () => {
  // Ask the user before removing an item from the cart.
  // This prevents accidental clicks on the Remove button.
  const removeButtons = document.querySelectorAll("button.danger");

  removeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      const confirmed = window.confirm("Remove this item from your cart?");

      if (!confirmed) {
        event.preventDefault();
      }
    });
  });

  // Hide success/error messages after a few seconds.
  // The message still appears first, so users know what happened.
  const notice = document.querySelector(".notice");

  if (notice) {
    setTimeout(() => {
      notice.style.display = "none";
    }, 5000);
  }
});
