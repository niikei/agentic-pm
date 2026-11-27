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
  for (const link of document.querySelectorAll(".rail nav a")) {
    if (link.hash === target) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}
window.addEventListener("hashchange", markSection);
markSection();
register.querySelector(".toolbar").hidden = false;
