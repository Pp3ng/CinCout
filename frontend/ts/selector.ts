// Use Immediately Invoked Function Expression (IIFE) to create closure and avoid global namespace pollution
(function() {
  // Define interfaces and types
  interface SelectOptions {
    container: HTMLElement;
    optionsContainer: HTMLElement;
  }

  type SelectMap = Map<HTMLSelectElement, SelectOptions>;

  // Use class to encapsulate core functionality
  class EnhancedSelect {
    private selectMap: SelectMap = new Map();
    private observers: Map<string, MutationObserver> = new Map();
    
    constructor() {
      document.addEventListener('DOMContentLoaded', () => {
        this.initialize();
      });
    }
    
    // Initialize all selectors and set up listeners
    private initialize(): void {
      this.initializeSelectDropdowns();
      this.setupOptionChangeObservers();
    }
    
    // Initialize all select elements
    private initializeSelectDropdowns(): void {
      const selects = document.querySelectorAll('select');
      selects.forEach(select => {
        this.enhanceSelect(select as HTMLSelectElement);
      });
    }
    
    // Enhance a single select element

    private enhanceSelect(select: HTMLSelectElement): void {
      // Skip if already enhanced
      if (select.parentNode?.classList.contains('custom-select-container')) {
        return;
      }
      
      // Create wrapper container
      const container = document.createElement('div');
      container.className = 'custom-select-container';
      container.setAttribute('data-for', select.id);
      
      // Place the container
      select.parentNode!.insertBefore(container, select);
      container.appendChild(select);
      
      // Create options container
      const optionsContainer = document.createElement('div');
      optionsContainer.className = 'select-options';
      container.appendChild(optionsContainer);
      
      // Save references for future access
      this.selectMap.set(select, {
        container,
        optionsContainer
      });
      
      // Build custom options
      this.rebuildCustomOptions(select);
      
      // Add event listeners
      this.setupEventListeners(select);
      
      // Initialize selected item
      setTimeout(() => {
        this.updateSelectedOption(select);
      }, 0);
    }
    
    // Set up event listeners for select element
    private setupEventListeners(select: HTMLSelectElement): void {
      const options = this.selectMap.get(select);
      if (!options) return;
      
      const { container, optionsContainer } = options;
      
      // Update UI when select changes
      select.addEventListener('change', () => {
        this.updateSelectedOption(select);
      });
      
      // Hide options when mouse leaves
      container.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!container.matches(':hover')) {
            optionsContainer.style.display = 'none';
          }
        }, 100);
      });
      
      // Show options when mouse enters
      container.addEventListener('mouseenter', () => {
        optionsContainer.style.display = 'block';
      });
    }
    
    // Update the selected option
    private updateSelectedOption(select: HTMLSelectElement): void {
      const options = this.selectMap.get(select);
      if (!options) return;
      
      const { optionsContainer } = options;
      const selectedIndex = select.selectedIndex;
      
      optionsContainer.querySelectorAll('.custom-option').forEach((opt, index) => {
        if (index === selectedIndex) {
          opt.classList.add('selected');
        } else {
          opt.classList.remove('selected');
        }
      });
    }
    
    // Rebuild custom option list
    private rebuildCustomOptions(select: HTMLSelectElement): void {
      const options = this.selectMap.get(select);
      if (!options) return;
      
      const { optionsContainer } = options;
      
      // Clear existing options
      optionsContainer.innerHTML = '';
      
      // Add custom options
      Array.from(select.options).forEach((option, index) => {
        const customOption = this.createCustomOption(select, option, index);
        optionsContainer.appendChild(customOption);
      });
    }
    
    // Create a single custom option
    private createCustomOption(select: HTMLSelectElement, option: HTMLOptionElement, index: number): HTMLElement {
      const customOption = document.createElement('div');
      customOption.className = 'custom-option';
      if (option.selected) {
        customOption.classList.add('selected');
      }
      
      customOption.textContent = option.text;
      customOption.setAttribute('data-value', option.value);
      customOption.setAttribute('data-index', index.toString());
      
      // Handle option selection
      customOption.addEventListener('click', () => {
        this.handleOptionClick(select, customOption, index);
      });
      
      return customOption;
    }
    
    // Handle option click event
    private handleOptionClick(select: HTMLSelectElement, customOption: HTMLElement, index: number): void {
      const options = this.selectMap.get(select);
      if (!options) return;
      
      const { optionsContainer } = options;
      
      // Update actual select element
      select.selectedIndex = index;
      
      // Trigger change event
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
      
      // Update selected style
      optionsContainer.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      customOption.classList.add('selected');
      
      // Hide options
      setTimeout(() => {
        optionsContainer.style.display = 'none';
      }, 100);
    }
    
    // Setup option change listeners
    private setupOptionChangeObservers(): void {
      const templateSelect = document.getElementById('template') as HTMLSelectElement;
      if (!templateSelect) return;
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            this.rebuildCustomOptions(templateSelect);
          }
        });
      });
      
      // Start observing template select's child element changes
      observer.observe(templateSelect, { childList: true });
      
      // Save observer reference for possible future cleanup
      this.observers.set(templateSelect.id, observer);
    }
  }
  
  // Create singleton instance
  new EnhancedSelect();
})();