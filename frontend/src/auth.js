export function isLoggedIn() {
  return localStorage.getItem("admin_logged_in") === "yes";
}

export function loginSuccess() {
  localStorage.setItem("admin_logged_in", "yes");
}

export function logout() {
  localStorage.removeItem("admin_logged_in");
}
