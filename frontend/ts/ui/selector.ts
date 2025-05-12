// Custom Select Component

// Type definitions
type SelectOption = {
  value: string;
  text: string;
  selected: boolean;
};

// Track select elements that need refreshing
const selectElements = new Map<string, HTMLElement>();

// Inject styles only once
const injectCustomSelectStyles = (): void => {
  if (document.getElementById("custom-select-styles")) return;

  const css = `
    /* Base select styling */
    select {
      appearance: none;
      background: var(--bg-primary);
      color: var(--text-primary);
      border: 2px solid var(--border);
      padding: 0 10px 0 8px;
      border-radius: var(--radius-sm);
      font: var(--font-xs) var(--font-mono);
      height: 28px;
      cursor: pointer;
      transition: all var(--transition-normal);
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
    }

    /* Select widths */
    select#language { width: 55px; }
    select#compiler { width: 70px; }
    select#template { width: 140px; }
    select#optimization { width: 130px; }

    /* Select states */
    select:hover, select:focus {
      border-color: var(--accent);
      box-shadow: var(--shadow-accent-sm);
      outline: none;
    }
    
    select:hover {
      animation: selectHover var(--transition-normal);
    }

    select option {
      background: var(--bg-secondary);
      color: var(--text-primary);
      padding: 12px;
      font-family: var(--font-mono);
    }

    /* Custom select container */
    .custom-select-container {
      position: relative;
      display: inline-block;
    }

    /* Custom dropdown arrow */
    .custom-select-container::after {
      content: "";
      position: absolute;
      right: 8px;
      top: 50%;
      width: 5px;
      height: 5px;
      border-right: 1.5px solid var(--text-secondary);
      border-bottom: 1.5px solid var(--text-secondary);
      transform: translateY(-70%) rotate(45deg);
      pointer-events: none;
      transition: all var(--transition-normal);
      box-shadow: 0px 0px 1px rgba(var(--accent-rgb), 0.3);
    }

    .custom-select-container:hover::after {
      transform: translateY(-55%) rotate(225deg);
      transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
      border-color: var(--accent);
      box-shadow: 0px 0px 2px rgba(var(--accent-rgb), 0.5);
    }

    /* Custom dropdown */
    .select-options {
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      margin-top: 4px;
      max-height: 200px;
      overflow-y: auto;
      background: var(--bg-secondary);
      border: 2px solid var(--accent);
      border-radius: var(--radius-sm);
      z-index: var(--z-dropdown);
      box-shadow: var(--shadow-accent-md);
      display: none;
      animation: fadeIn var(--transition-normal);
    }

    .custom-select-container:hover .select-options {
      display: block;
    }

    .custom-select-container select {
      background-image: none;
      pointer-events: none;
    }

    /* Custom option styling */
    .custom-option {
      padding: 6px 10px;
      cursor: pointer;
      border-left: 0px solid var(--accent);
      text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
      font-family: var(--font-mono);
    }

    .custom-option:hover {
      background: var(--accent);
      color: white;
      border-left: 3px solid var(--accent);
      padding-left: 7px;
      text-shadow: 0 1px 1px rgba(var(--accent-rgb), 0.1);
      box-shadow: inset 0 0 5px rgba(var(--accent-rgb), 0.05);
    }

    .custom-option.selected {
      background-color: rgba(var(--accent-rgb), 0.1);
      font-weight: bold;
      border-left: 3px solid var(--accent);
      padding-left: 7px;
      color: var(--accent);
      text-shadow: 0 1px 1px rgba(var(--accent-rgb), 0.1);
    }

    @keyframes selectHover {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
  `;

  const styleElement = document.createElement("style");
  styleElement.id = "custom-select-styles";
  styleElement.textContent = css;
  document.head.appendChild(styleElement);
};

// Create select container
const createSelectContainer = (select: HTMLSelectElement): HTMLElement => {
  const container = document.createElement("div");
  container.className = "custom-select-container";
  container.setAttribute("data-for", select.id);

  const optionsContainer = document.createElement("div");
  optionsContainer.className = "select-options";

  if (select.parentNode) {
    select.parentNode.insertBefore(container, select);
    container.appendChild(select);
    container.appendChild(optionsContainer);
  }

  return container;
};

// Create custom select component
const createCustomSelect = (select: HTMLSelectElement): void => {
  // Get or create container
  const container =
    select.parentNode instanceof Element &&
    select.parentNode.classList.contains("custom-select-container")
      ? (select.parentNode as HTMLElement)
      : createSelectContainer(select);

  // Store container reference for template select
  if (select.id === "template") {
    selectElements.set("template", container);
  }

  const optionsContainer = container.querySelector(
    ".select-options"
  ) as HTMLElement;

  // Build option list
  const buildOptions = (): void => {
    optionsContainer.innerHTML = "";

    Array.from(select.options).forEach((option, index) => {
      const customOption = document.createElement("div");
      customOption.className = `custom-option${
        option.selected ? " selected" : ""
      }`;
      customOption.textContent = option.text;
      customOption.dataset.value = option.value;

      // Click event
      customOption.addEventListener("click", () => {
        select.selectedIndex = index;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        optionsContainer.style.display = "none";
      });

      optionsContainer.appendChild(customOption);
    });
  };

  // Update UI selection state
  const updateSelectedUI = (): void => {
    const selectedIndex = select.selectedIndex;
    optionsContainer
      .querySelectorAll(".custom-option")
      .forEach((opt, index) => {
        opt.classList.toggle("selected", index === selectedIndex);
      });
  };

  // Refresh the custom select (rebuild options)
  const refreshSelect = (): void => {
    buildOptions();
    updateSelectedUI();
  };

  // Setup event listeners
  select.addEventListener("change", updateSelectedUI);

  container.addEventListener("mouseenter", () => {
    optionsContainer.style.display = "block";
  });

  container.addEventListener("mouseleave", () => {
    setTimeout(() => {
      if (!container.matches(":hover")) {
        optionsContainer.style.display = "none";
      }
    }, 100);
  });

  // Initialize
  buildOptions();
  setTimeout(updateSelectedUI, 0);

  // Set up MutationObserver for template select element
  if (select.id === "template") {
    new MutationObserver(() => refreshSelect()).observe(select, {
      childList: true,
      subtree: true,
    });
  }
};

// Initialize all select elements
const initCustomSelects = (): void => {
  // Inject styles
  injectCustomSelectStyles();

  // Initialize all select elements
  document.querySelectorAll("select").forEach((select) => {
    const selectElement = select as HTMLSelectElement;
    createCustomSelect(selectElement);
  });
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initCustomSelects);
