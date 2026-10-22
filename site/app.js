/**
 * SiteIntel Pulse — Static Showcase Interactive Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Tab Switching (Owner Report vs Expert Diagnostic)
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");

      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add("active");
      }
    });
  });

  // 2. Interactive Finding Details Inspector
  const findingRows = document.querySelectorAll(".finding-row-interactive");
  findingRows.forEach((row) => {
    row.addEventListener("click", () => {
      const details = row.nextElementSibling;
      if (details && details.classList.contains("finding-details")) {
        const isExpanded = details.style.display === "table-row";
        details.style.display = isExpanded ? "none" : "table-row";
        const indicator = row.querySelector(".expand-indicator");
        if (indicator) {
          indicator.textContent = isExpanded ? "▶" : "▼";
        }
      }
    });
  });

  // 3. Category Filter in Catalogue Table
  const searchInput = document.getElementById("catalogue-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const rows = document.querySelectorAll(".catalogue-table tbody tr");
      rows.forEach((r) => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(query) ? "" : "none";
      });
    });
  }
});
