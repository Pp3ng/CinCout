interface SelectOptions {
  container: HTMLElement;
  optionsContainer: HTMLElement;
}

type SelectMap = Map<HTMLSelectElement, SelectOptions>;

const selectMap: SelectMap = new Map();

const init = () => {
  const selects = document.querySelectorAll("select");
  selects.forEach((select) => {
    enhanceSelect(select as HTMLSelectElement);
  });

  observeSelectMutation();
};

const enhanceSelect = (select: HTMLSelectElement): void => {
  if (select.parentNode?.classList.contains("custom-select-container")) return;

  const container = document.createElement("div");
  container.className = "custom-select-container";
  container.setAttribute("data-for", select.id);

  select.parentNode!.insertBefore(container, select);
  container.appendChild(select);

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "select-options";
  container.appendChild(optionsContainer);

  selectMap.set(select, { container, optionsContainer });

  rebuildCustomOptions(select);
  setupEvents(select);

  setTimeout(() => updateSelectedUI(select), 0);
};

const setupEvents = (select: HTMLSelectElement) => {
  const entry = selectMap.get(select);
  if (!entry) return;

  const { container, optionsContainer } = entry;

  select.addEventListener("change", () => updateSelectedUI(select));

  container.addEventListener("mouseleave", () => {
    setTimeout(() => {
      if (!container.matches(":hover")) {
        optionsContainer.style.display = "none";
      }
    }, 100);
  });

  container.addEventListener("mouseenter", () => {
    optionsContainer.style.display = "block";
  });
};

const updateSelectedUI = (select: HTMLSelectElement) => {
  const entry = selectMap.get(select);
  if (!entry) return;

  const { optionsContainer } = entry;
  const selectedIndex = select.selectedIndex;

  optionsContainer.querySelectorAll(".custom-option").forEach((opt, index) => {
    opt.classList.toggle("selected", index === selectedIndex);
  });
};

const rebuildCustomOptions = (select: HTMLSelectElement) => {
  const entry = selectMap.get(select);
  if (!entry) return;

  const { optionsContainer } = entry;
  optionsContainer.innerHTML = "";

  Array.from(select.options).forEach((option, index) => {
    const customOption = document.createElement("div");
    customOption.className = "custom-option";
    if (option.selected) customOption.classList.add("selected");

    customOption.textContent = option.text;
    customOption.setAttribute("data-value", option.value);
    customOption.setAttribute("data-index", index.toString());

    customOption.addEventListener("click", () => {
      select.selectedIndex = index;
      select.dispatchEvent(new Event("change", { bubbles: true }));

      optionsContainer.querySelectorAll(".custom-option").forEach(opt =>
        opt.classList.remove("selected")
      );
      customOption.classList.add("selected");

      setTimeout(() => {
        optionsContainer.style.display = "none";
      }, 100);
    });

    optionsContainer.appendChild(customOption);
  });
};

const observeSelectMutation = () => {
  const templateSelect = document.getElementById("template") as HTMLSelectElement;
  if (!templateSelect) return;

  const observer = new MutationObserver(() => {
    rebuildCustomOptions(templateSelect);
  });

  observer.observe(templateSelect, { childList: true });
};

window.addEventListener("DOMContentLoaded", init);
