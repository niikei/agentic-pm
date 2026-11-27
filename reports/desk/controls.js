const register = document.querySelector("#tasks");
const search = register.querySelector("input");
const select = register.querySelector("select");
const rows = [...register.querySelectorAll("tbody tr")];
const matches = register.querySelector("#matches");
const empty = register.querySelector("#empty");
function inGroup(row, group) {
  const { stage, date, offset, question } = row.dataset;
  switch (group) {
    case "all":
      return true;
    case "overdue":
      return date && Number(offset) < 0;
    case "today":
      return offset === "0";
    case "later":
      return date && Number(offset) >= 7;
    case "undated":
      return !date;
    case "question":
      return question === "true";
    default:
      return group === stage || group === `day:${date}`;
  }
}
function refresh() {
  let count = 0;
  const query = search.value.trim().toLocaleLowerCase();
  for (const row of rows) {
    row.hidden = !(
      inGroup(row, select.value) &&
      row.textContent.toLocaleLowerCase().includes(query)
    );
    if (!row.hidden) count++;
  }
  matches.textContent = `${count}件`;
  empty.hidden = count !== 0;
}
search.addEventListener("input", refresh);
select.addEventListener("change", refresh);
for (const link of document.querySelectorAll("[data-filter]")) {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    select.value = link.dataset.filter;
    search.value = "";
    refresh();
    select.focus({ preventScroll: true });
  });
}
function markSection() {
  const target = location.hash || "#overview";
  if (target.startsWith("#record-")) {
    const details = document.getElementById(target.slice(1));
    if (details?.matches("#tasks details")) {
      if (details.closest("tr").hidden) {
        search.value = "";
        select.value = "all";
        refresh();
      }
      details.open = true;
      details.querySelector("summary").focus({ preventScroll: true });
      details.scrollIntoView({ block: "center" });
    }
  }
  for (const link of document.querySelectorAll(".rail nav a")) {
    if (link.hash === target) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("hashchange", markSection);
markSection();
register.querySelector(".toolbar").hidden = false;

const navigation = document.querySelector("#desk-nav");
const toggle = document.querySelector(".nav-toggle");
const shell = document.querySelector(".shell");
const preference = "agentic-pm.desk.compact";
function showNavigation(expanded) {
  navigation.hidden = !expanded;
  shell.toggleAttribute("data-compact", !expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  const label = expanded ? "ナビを閉じる" : "ナビを開く";
  toggle.setAttribute("aria-label", label);
  toggle.title = label;
  toggle.firstElementChild.textContent = expanded ? "‹" : "›";
}
toggle.hidden = false;
try {
  showNavigation(localStorage.getItem(preference) !== "yes");
} catch {
  showNavigation(true);
}
toggle.addEventListener("click", () => {
  showNavigation(navigation.hidden);
  try {
    localStorage.setItem(preference, navigation.hidden ? "yes" : "no");
  } catch {
    // File viewers can disable storage; the current page still toggles.
  }
});
