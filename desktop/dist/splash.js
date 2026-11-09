// Checks the ERP is reachable, then opens it. Shows a retry button when offline.
const SITE = "https://crm.arulmotors.com/";
const statusText = document.getElementById("status");
const retry = document.getElementById("retry");

async function connect() {
  statusText.textContent = "Connecting…";
  retry.hidden = true;
  try {
    await fetch(SITE, { mode: "no-cors", cache: "no-store", signal: AbortSignal.timeout(15000) });
    window.location.replace(SITE);
  } catch {
    statusText.textContent = "Can't reach the ERP. Check the internet connection and try again.";
    retry.hidden = false;
  }
}

retry.addEventListener("click", connect);
window.addEventListener("online", connect);
connect();
