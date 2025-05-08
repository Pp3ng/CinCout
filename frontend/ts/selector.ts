// Custom Select Component
import { SelectOption } from "./types";

class CustomSelect {
  private container: HTMLElement;
  private optionsContainer: HTMLElement;

  constructor(private select: HTMLSelectElement) {
    if (
      this.select.parentNode instanceof Element &&
      this.select.parentNode.classList.contains("custom-select-container")
    ) {
      this.container = this.select.parentNode as HTMLElement;
      this.optionsContainer = this.container.querySelector(
        ".select-options"
      ) as HTMLElement;
      return;
    }

    this.container = document.createElement("div");
    this.container.className = "custom-select-container";
    this.container.setAttribute("data-for", this.select.id);

    this.optionsContainer = document.createElement("div");
    this.optionsContainer.className = "select-options";

    if (this.select.parentNode) {
      this.select.parentNode.insertBefore(this.container, this.select);
      this.container.appendChild(this.select);
      this.container.appendChild(this.optionsContainer);
    }

    this.initialize();
  }

  private initialize(): void {
    this.buildOptions();
    this.setupEventListeners();

    setTimeout(() => this.updateSelectedUI(), 0);
  }

  private setupEventListeners(): void {
    this.select.addEventListener("change", () => this.updateSelectedUI());

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
      customOption.className = `custom-option${
        option.selected ? " selected" : ""
      }`;
      customOption.textContent = option.text;
      customOption.dataset.value = option.value;
      customOption.dataset.index = index.toString();

      customOption.addEventListener("click", () => {
        this.select.selectedIndex = index;
        this.select.dispatchEvent(new Event("change", { bubbles: true }));
        this.optionsContainer.style.display = "none";
      });

      this.optionsContainer.appendChild(customOption);
    });
  }

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
    document
      .querySelectorAll("select")
      .forEach((select) => this.enhance(select as HTMLSelectElement));

    this.observeTemplateSelect();
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

  private observeTemplateSelect(): void {
    const templateSelect = document.getElementById(
      "template"
    ) as HTMLSelectElement;
    if (!templateSelect) return;

    const customSelect = this.getCustomSelect(templateSelect);
    if (!customSelect) return;

    new MutationObserver(() => customSelect.refresh()).observe(templateSelect, {
      childList: true,
    });
  }
}

const selectManager = new CustomSelectManager();
document.addEventListener("DOMContentLoaded", () => selectManager.init());
