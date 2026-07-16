const output = document.querySelector("#events");
const form = document.querySelector("#request-form");
const input = document.querySelector("#request");
const dashboard = document.querySelector("#dashboard");
const stream = new EventSource("/events");
const labels = { status: "status", plan: "plan", diff: "changes", done: "done", refused: "refused", reverted: "reverted" };

if (location.hostname === "localhost") dashboard.src = "http://localhost:5173/userland/";

for (const [type, label] of Object.entries(labels)) {
  stream.addEventListener(type, (event) => { output.textContent += `${label}: ${event.data}\n`; });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await fetch("/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: input.value }),
  });
  if (!response.ok) output.textContent += `request: ${await response.text()}\n`;
});
