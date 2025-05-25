import themeManager from "./themeManager";
import { getEditorService } from "../service/editor";
import { getTemplateList, getTemplateContent } from "../service/templates";

// Static select options
const LANGUAGE_OPTIONS = [
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
];
const COMPILER_OPTIONS = [
  { value: "gcc", label: "GCC" },
  { value: "clang", label: "Clang" },
];
const OPTIMIZATION_OPTIONS = [
  { value: "-O0", label: "-O0 (No optimization)" },
  { value: "-O1", label: "-O1 (Basic optimization)" },
  { value: "-O2", label: "-O2 (Moderate optimization)" },
  { value: "-O3", label: "-O3 (Maximum optimization)" },
  { value: "-Os", label: "-Os (Size optimization)" },
];

// Global selector state - Ready for React migration
interface SelectorState {
  language: string;
  compiler: string;
  optimization: string;
  template?: string;
  "theme-select"?: string;
}

type StateChangeListener = (key: keyof SelectorState, value: string) => void;
let globalSelectorState: SelectorState = {
  language: "c",
  compiler: "gcc",
  optimization: "-O0",
};
const stateChangeListeners: StateChangeListener[] = [];
const subscribeToSelectorState = (listener: StateChangeListener) => {
  stateChangeListeners.push(listener);
  return () => {
    const idx = stateChangeListeners.indexOf(listener);
    if (idx > -1) stateChangeListeners.splice(idx, 1);
  };
};
const updateSelectorState = (key: keyof SelectorState, value: string) => {
  if (globalSelectorState[key] === value) return;
  globalSelectorState[key] = value;
  stateChangeListeners.forEach((fn) => fn(key, value));
  if (key === "theme-select") themeManager.setTheme(value);
};
export const getSelectorState = () => ({ ...globalSelectorState });

const renderSelect = (
  id: string,
  options: { value: string; label: string }[],
  defaultValue?: string
) => {
  const select = document.getElementById(id) as HTMLSelectElement | null;
  if (!select) return;
  select.innerHTML = options
    .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
    .join("");
  if (defaultValue) {
    select.value = defaultValue;
    updateSelectorState(id as keyof SelectorState, defaultValue);
  }
};

// Render theme select with available themes
const renderThemeSelect = () => {
  const themes = themeManager.getThemes();
  const options = Object.entries(themes).map(([key, theme]) => ({
    value: key,
    label: theme.name || key,
  }));
  const themeValue =
    globalSelectorState["theme-select"] || themeManager.getCurrentThemeName();
  renderSelect("theme-select", options, themeValue);
};

// Render template select based on language
const renderTemplateSelect = async (language: string) => {
  const select = document.getElementById(
    "template"
  ) as HTMLSelectElement | null;
  if (!select) return;
  select.disabled = true;
  select.innerHTML = `<option>Loading templates...</option>`;
  const templateNames = await getTemplateList(language);
  select.disabled = false;
  if (!templateNames.length) {
    select.innerHTML = `<option>No templates available</option>`;
    return;
  }
  select.innerHTML = templateNames
    .map((name) => `<option value="${name}">${name}</option>`)
    .join("");
  const helloWorldIdx = templateNames.indexOf("Hello World");
  select.selectedIndex = helloWorldIdx >= 0 ? helloWorldIdx : 0;

  // Sync state with global selector
  updateSelectorState("template", select.value);
  await loadAndSetTemplateContent(language, select.value);
};

const selectorHandlers: Record<string, (value: string) => void> = {
  language: async (value) => {
    updateSelectorState("language", value);
    await renderTemplateSelect(value);
  },
  compiler: (value) => updateSelectorState("compiler", value),
  optimization: (value) => updateSelectorState("optimization", value),
  template: async (value) => {
    updateSelectorState("template", value);
    await loadAndSetTemplateContent(globalSelectorState.language, value);
  },
  "theme-select": (value) => updateSelectorState("theme-select", value),
};

const handleSelectorChange = (selectId: string, value: string) => {
  const handler = selectorHandlers[selectId];
  if (handler) handler(value);
};

const loadAndSetTemplateContent = async (
  language: string,
  templateName: string
) => {
  const editorService = getEditorService();
  if (!editorService) return;
  // Set "Loading template..." only if no content is set
  if (!editorService.getValue || !editorService.getValue()) {
    editorService.setValue("// Loading template...");
  }
  const content = await getTemplateContent(language, templateName);
  editorService.setValue(content);
};

const injectCustomSelectStyles = () => {
  if (document.getElementById("custom-select-styles")) return;
  const style = document.createElement("style");
  style.id = "custom-select-styles";
  style.textContent = `
    select { appearance: none; background: var(--bg-primary); color: var(--text-primary); border: 2px solid var(--border); padding: 0 10px 0 8px; border-radius: var(--radius-sm); font: var(--font-xs) var(--font-mono); height: 28px; cursor: pointer; transition: all var(--transition-normal); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; text-shadow: 0 1px 1px rgba(0,0,0,0.05); }
    select#language { width: 55px; } select#compiler { width: 70px; } select#template { width: 140px; } select#optimization { width: 130px; }
    select:hover, select:focus { border-color: var(--accent); box-shadow: var(--shadow-accent-sm); outline: none; }
    select:hover { animation: selectHover var(--transition-normal); }
    select option { background: var(--bg-secondary); color: var(--text-primary); padding: 12px; font-family: var(--font-mono); }
    .custom-select-container { position: relative; display: inline-block; }
    .custom-select-container::after { content: ""; position: absolute; right: 8px; top: 50%; width: 5px; height: 5px; border-right: 1.5px solid var(--text-secondary); border-bottom: 1.5px solid var(--text-secondary); transform: translateY(-70%) rotate(45deg); pointer-events: none; transition: all var(--transition-normal); box-shadow: 0px 0px 1px rgba(var(--accent-rgb), 0.3); }
    .custom-select-container:hover::after { transform: translateY(-55%) rotate(225deg); transition-timing-function: cubic-bezier(0.34,1.56,0.64,1); border-color: var(--accent); box-shadow: 0px 0px 2px rgba(var(--accent-rgb),0.5); }
    .select-options { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; max-height: 200px; overflow-y: auto; background: var(--bg-secondary); border: 2px solid var(--accent); border-radius: var(--radius-sm); z-index: 100; box-shadow: var(--shadow-accent-md); display: none; animation: fadeIn var(--transition-normal); }
    .custom-select-container:hover .select-options { display: block; }
    .custom-select-container select { background-image: none; pointer-events: none; }
    .custom-option { padding: 6px 10px; cursor: pointer; border-left: 0px solid var(--accent); text-shadow: 0 1px 1px rgba(0,0,0,0.05); font-family: var(--font-mono); }
    .custom-option:hover { background: var(--accent); color: white; border-left: 3px solid var(--accent); padding-left: 7px; text-shadow: 0 1px 1px rgba(var(--accent-rgb),0.1); box-shadow: inset 0 0 5px rgba(var(--accent-rgb),0.05); }
    .custom-option.selected { background-color: rgba(var(--accent-rgb),0.1); font-weight: bold; border-left: 3px solid var(--accent); padding-left: 7px; color: var(--accent); text-shadow: 0 1px 1px rgba(var(--accent-rgb),0.1); }
    @keyframes selectHover { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-2px);} }
  `;
  document.head.appendChild(style);
};

const createCustomSelect = (select: HTMLSelectElement): void => {
  let container = select.parentElement;
  if (!container || !container.classList.contains("custom-select-container")) {
    container = document.createElement("div");
    container.className = "custom-select-container";
    container.setAttribute("data-for", select.id);
    select.parentNode?.insertBefore(container, select);
    container.appendChild(select);
    const opts = document.createElement("div");
    opts.className = "select-options";
    container.appendChild(opts);
  }
  const optionsContainer = container.querySelector(
    ".select-options"
  ) as HTMLElement;
  const updateUI = () => {
    optionsContainer.innerHTML = Array.from(select.options)
      .map((option) => {
        const selected = option.value === select.value ? " selected" : "";
        return `<div class="custom-option${selected}" data-value="${option.value}">${option.text}</div>`;
      })
      .join("");
    optionsContainer
      .querySelectorAll<HTMLElement>(".custom-option")
      .forEach((el, idx) => {
        el.onclick = () => {
          select.selectedIndex = idx;
          select.value = select.options[idx].value;
          handleSelectorChange(select.id, select.value);
          updateUI();
          optionsContainer.style.display = "none";
        };
      });
  };
  select.addEventListener("change", updateUI);
  container.addEventListener(
    "mouseenter",
    () => (optionsContainer.style.display = "block")
  );
  container.addEventListener("mouseleave", () =>
    setTimeout(() => {
      if (!container!.matches(":hover"))
        optionsContainer.style.display = "none";
    }, 100)
  );
  subscribeToSelectorState((key: keyof SelectorState, value: string) => {
    if (key === select.id && select.value !== value) {
      select.value = value;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === value) {
          select.selectedIndex = i;
          break;
        }
      }
      updateUI();
    }
  });
  updateUI();
  if (select.id === "template") {
    new MutationObserver(updateUI).observe(select, { childList: true });
  }
};

const initCustomSelects = () => {
  document
    .querySelectorAll("select")
    .forEach((sel) => createCustomSelect(sel as HTMLSelectElement));
};

// Initialize all selects
export const initSelects = async () => {
  injectCustomSelectStyles();
  renderSelect("language", LANGUAGE_OPTIONS, "c");
  renderSelect("compiler", COMPILER_OPTIONS, "gcc");
  renderSelect("optimization", OPTIMIZATION_OPTIONS, "-O0");
  renderThemeSelect();
  await renderTemplateSelect(globalSelectorState.language);
  initCustomSelects();
};
