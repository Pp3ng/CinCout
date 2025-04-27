/**
 * CustomSelect - A class-based implementation of custom select elements
 * Designed for easier migration to React components in the future
 */

interface SelectOption {
  value: string;
  text: string;
  selected: boolean;
}

class CustomSelect {
  private select: HTMLSelectElement;
  private container!: HTMLElement;
  private optionsContainer!: HTMLElement;

  constructor(selectElement: HTMLSelectElement) {
    this.select = selectElement;

    // Skip if already enhanced
    if (
      this.select.parentNode instanceof Element &&
      this.select.parentNode.classList.contains("custom-select-container")
    ) {
      return;
    }

    this.container = this.createContainer();
    this.optionsContainer = this.createOptionsContainer();
    this.initialize();
  }

  private createContainer(): HTMLElement {
    const container = document.createElement("div");
    container.className = "custom-select-container";
    container.setAttribute("data-for", this.select.id);

    if (this.select.parentNode) {
      this.select.parentNode.insertBefore(container, this.select);
      container.appendChild(this.select);
    }

    return container;
  }

  private createOptionsContainer(): HTMLElement {
    const optionsContainer = document.createElement("div");
    optionsContainer.className = "select-options";
    this.container.appendChild(optionsContainer);
    return optionsContainer;
  }

  private initialize(): void {
    this.buildOptions();
    this.setupEventListeners();

    // Update UI after the next event loop
    setTimeout(() => this.updateSelectedUI(), 0);
  }

  private setupEventListeners(): void {
    // Handle native select change events
    this.select.addEventListener("change", () => this.updateSelectedUI());

    // Handle container mouse interactions
    this.container.addEventListener("mouseenter", () => {
      this.optionsContainer.style.display = "block";
    });

    this.container.addEventListener("mouseleave", () => {
      setTimeout(() => {
        if (!this.container.matches(":hover")) {
          this.optionsContainer.style.display = "none";
        }
      }, 100);
    });
  }

  private updateSelectedUI(): void {
    const selectedIndex = this.select.selectedIndex;

    this.optionsContainer
      .querySelectorAll(".custom-option")
      .forEach((opt, index) => {
        opt.classList.toggle("selected", index === selectedIndex);
      });
  }

  public getOptions(): SelectOption[] {
    return Array.from(this.select.options).map((option) => ({
      value: option.value,
      text: option.text,
      selected: option.selected,
    }));
  }

  public buildOptions(): void {
    this.optionsContainer.innerHTML = "";

    this.getOptions().forEach((option, index) => {
      const customOption = document.createElement("div");
      customOption.className = "custom-option";
      if (option.selected) customOption.classList.add("selected");

      customOption.textContent = option.text;
      customOption.setAttribute("data-value", option.value);
      customOption.setAttribute("data-index", index.toString());

      customOption.addEventListener("click", () => {
        this.select.selectedIndex = index;
        this.select.dispatchEvent(new Event("change", { bubbles: true }));

        this.optionsContainer
          .querySelectorAll(".custom-option")
          .forEach((opt) => opt.classList.remove("selected"));
        customOption.classList.add("selected");

        setTimeout(() => {
          this.optionsContainer.style.display = "none";
        }, 100);
      });

      this.optionsContainer.appendChild(customOption);
    });
  }

  // Method to update custom select when options change
  public refresh(): void {
    this.buildOptions();
    this.updateSelectedUI();
  }
}

/**
 * CustomSelectManager - Handles all custom select instances on the page
 */
class CustomSelectManager {
  private selects: Map<HTMLSelectElement, CustomSelect> = new Map();

  public init(): void {
    // Initialize all selects on page load
    document.querySelectorAll("select").forEach((select) => {
      this.enhance(select as HTMLSelectElement);
    });

    this.setupMutationObserver();
  }

  public enhance(selectElement: HTMLSelectElement): CustomSelect {
    const customSelect = new CustomSelect(selectElement);
    this.selects.set(selectElement, customSelect);
    return customSelect;
  }

  public getCustomSelect(
    selectElement: HTMLSelectElement
  ): CustomSelect | undefined {
    return this.selects.get(selectElement);
  }

  private setupMutationObserver(): void {
    const templateSelect = document.getElementById(
      "template"
    ) as HTMLSelectElement;
    if (!templateSelect) return;

    const customSelect = this.getCustomSelect(templateSelect);
    if (!customSelect) return;

    const observer = new MutationObserver(() => {
      customSelect.refresh();
    });

    observer.observe(templateSelect, { childList: true });
  }
}

// Initialize the manager on DOM load
const selectManager = new CustomSelectManager();
window.addEventListener("DOMContentLoaded", () => selectManager.init());
