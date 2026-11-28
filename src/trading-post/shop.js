const filters = document.querySelector("[data-filters]");

if (filters) {
  const grid = document.querySelector("[data-listing-grid]");
  const entries = [...grid.querySelectorAll("[data-listing]")];
  const query = document.getElementById("query");
  const category = document.getElementById("category");
  const sort = document.getElementById("sort");
  const resultCount = document.querySelector("[data-result-count]");
  const noResults = document.querySelector("[data-no-results]");

  function update() {
    const search = query.value.trim().toLocaleLowerCase("en-US");
    const ordered = entries.slice();
    if (sort.value) {
      const direction = sort.value === "low" ? 1 : -1;
      ordered.sort((first, second) => direction * (Number(first.dataset.price) - Number(second.dataset.price)));
    }

    let visible = 0;
    for (const entry of ordered) {
      entry.hidden = !entry.textContent.toLocaleLowerCase("en-US").includes(search) ||
        Boolean(category.value && entry.dataset.category !== category.value);
      if (!entry.hidden) visible++;
      grid.append(entry);
    }
    resultCount.textContent = visible + (visible === 1 ? " item" : " items");
    noResults.hidden = visible > 0;
  }

  filters.hidden = false;
  resultCount.hidden = false;
  query.addEventListener("input", update);
  category.addEventListener("change", update);
  sort.addEventListener("change", update);
  document.getElementById("clear").addEventListener("click", () => {
    query.value = "";
    category.value = "";
    sort.value = "";
    update();
    query.focus();
  });
  update();
}
