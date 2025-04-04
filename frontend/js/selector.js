/**
 * Enhanced select dropdown that works with hover and allows selection
 */
document.addEventListener('DOMContentLoaded', function() {
  // Initialize selectors
  initializeSelectDropdowns();
  
  // Also set up a mutation observer to handle dynamic option changes
  setupOptionChangeObservers();
});

function initializeSelectDropdowns() {
  // Find all the select elements to enhance
  const selects = document.querySelectorAll('select');
  
  selects.forEach(select => {
    enhanceSelect(select);
  });
}

function enhanceSelect(select) {
  // Skip if already enhanced
  if (select.parentNode.classList.contains('custom-select-container')) {
    return;
  }
  
  // Create the wrapper container
  const container = document.createElement('div');
  container.className = 'custom-select-container';
  
  // Add data attribute to link back to the original select
  container.setAttribute('data-for', select.id);
  
  // Position the container where the select is
  const selectRect = select.getBoundingClientRect();
  select.parentNode.insertBefore(container, select);
  
  // Move the select into our container
  container.appendChild(select);
  
  // Create the options container
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'select-options';
  container.appendChild(optionsContainer);
  
  // Build the custom options initially
  rebuildCustomOptions(select, optionsContainer);
  
  // When select changes programmatically, update our custom UI
  select.addEventListener('change', function() {
    updateSelectedOption(this, optionsContainer);
  });
  
  // Fix for mouse leaving the options but remaining over the select
  container.addEventListener('mouseleave', function() {
    // Hide options after a short delay
    setTimeout(() => {
      // Only hide if we're not hovering the container again
      if (!container.matches(':hover')) {
        optionsContainer.style.display = 'none';
      }
    }, 100);
  });
  
  // Reshow options when entering the container
  container.addEventListener('mouseenter', function() {
    optionsContainer.style.display = 'block';
  });
}

// Function to update the selected option in the custom UI
function updateSelectedOption(select, optionsContainer) {
  const selectedIndex = select.selectedIndex;
  
  // Update selected state in custom options
  optionsContainer.querySelectorAll('.custom-option').forEach((opt, index) => {
    if (index === selectedIndex) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
}

// Function to rebuild custom options
function rebuildCustomOptions(select, optionsContainer) {
  // Clear existing options
  optionsContainer.innerHTML = '';
  
  // Add custom options to match the real select options
  Array.from(select.options).forEach((option, index) => {
    const customOption = document.createElement('div');
    customOption.className = 'custom-option';
    if (option.selected) {
      customOption.classList.add('selected');
    }
    customOption.textContent = option.text;
    customOption.setAttribute('data-value', option.value);
    customOption.setAttribute('data-index', index);
    
    // Handle option selection
    customOption.addEventListener('click', function(e) {
      // Update the real select element
      select.selectedIndex = parseInt(this.getAttribute('data-index'));
      
      // Trigger a change event for any listeners
      const event = new Event('change', { bubbles: true });
      select.dispatchEvent(event);
      
      // Update the selected option styling
      optionsContainer.querySelectorAll('.custom-option').forEach(opt => {
        opt.classList.remove('selected');
      });
      this.classList.add('selected');
      
      // Hide the options (optional)
      setTimeout(() => {
        optionsContainer.style.display = 'none';
      }, 100);
    });
    
    optionsContainer.appendChild(customOption);
  });
}

// Monitor for changes to the options of the select elements
function setupOptionChangeObservers() {
  // Monitor template select for changes
  const templateSelect = document.getElementById('template');
  if (templateSelect) {
    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Find the associated custom container
          const container = document.querySelector(`.custom-select-container[data-for="${templateSelect.id}"]`);
          if (container) {
            const optionsContainer = container.querySelector('.select-options');
            if (optionsContainer) {
              rebuildCustomOptions(templateSelect, optionsContainer);
            }
          }
        }
      });
    });
    
    // Start observing the template select for child changes
    observer.observe(templateSelect, { childList: true });
  }
}
