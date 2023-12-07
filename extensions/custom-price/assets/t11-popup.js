// Get the popup element
const popup = document.querySelector(".t11-popup");
const body = document.querySelector("body");

// Show the popup when the script is loaded
window.addEventListener("DOMContentLoaded", () => {
  // check if cookie exists
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("t11-popup="));
  if (cookie) {
    return;
  }
  popup.parentElement.classList.add("show");
  body.classList.add("t11-popup-overflow-hidden");
});

// Add event listener to toggle the popup on click
const closeButton = document.querySelector(".t11-popup-close button");
const overlay = document.querySelector(".t11-overlay");

// Function to close the popup
function closePopup() {
  popup.parentElement.classList.remove("show");
  body.classList.remove("overflow-hidden");

  // Calculate the expiration date
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 14); // 2 weeks from now

  // Format the expiration date as a string
  const expires = expirationDate.toUTCString();

  // Add cookie to prevent popup from showing again
  document.cookie = `t11-popup=1; expires=${expires}; path=/`;
}

// Add event listener to toggle the popup on click
closeButton.addEventListener("click", closePopup);
overlay.addEventListener("click", closePopup);
