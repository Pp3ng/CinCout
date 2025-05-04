import React, { useRef, useEffect } from "react";
import styled from "styled-components";
import { SelectOption } from "../types";

// Styled components converted from select.css
const SelectContainer = styled.div`
  position: relative;
  display: inline-block;

  /* Custom dropdown arrow */
  &::after {
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

  /* Arrow animation on hover */
  &:hover::after {
    transform: translateY(-55%) rotate(225deg);
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
    border-right: 1.5px solid var(--accent);
    border-bottom: 1.5px solid var(--accent);
    box-shadow: 0px 0px 2px rgba(var(--accent-rgb), 0.5);
  }

  /* Show options on hover */
  &:hover .select-options {
    display: block;
  }
`;

const StyledSelect = styled.select`
  appearance: none;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 2px solid var(--border);
  padding: 0px 10px 0px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  cursor: pointer;
  min-width: 0;
  height: 28px;
  background-image: none; /* Remove default arrow */
  transition: all var(--transition-normal);
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  position: relative;
  font-family: var(--font-mono);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);

  /* Specific widths for different select types */
  &#language {
    width: 55px;
  }

  &#compiler {
    width: 70px;
  }

  &#template {
    width: 140px;
  }

  &#optimization {
    width: 130px;
  }

  /* Select states */
  &:hover {
    border-color: var(--accent);
    box-shadow: var(--shadow-accent-sm);
    animation: selectHover var(--transition-normal);
  }

  &:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: var(--shadow-accent-sm);
  }

  /* Hide default select arrow and make it unclickable */
  background-image: none;
  pointer-events: none;

  option {
    background: var(--bg-secondary);
    color: var(--text-primary);
    padding: 12px;
    font-family: var(--font-mono);
  }
`;

const OptionsContainer = styled.div`
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
`;

const Option = styled.div<{ isSelected?: boolean }>`
  padding: 6px 10px;
  cursor: pointer;
  border-left: ${(props) => (props.isSelected ? "3px" : "0px")} solid
    var(--accent);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
  font-family: var(--font-mono);
  padding-left: ${(props) => (props.isSelected ? "7px" : "10px")};

  ${(props) =>
    props.isSelected &&
    `
    background-color: rgba(var(--accent-rgb), 0.1);
    font-weight: bold;
    color: var(--accent);
    text-shadow: 0 1px 1px rgba(var(--accent-rgb), 0.1);
  `}

  &:hover {
    background: var(--accent);
    color: white;
    border-left: 3px solid var(--accent);
    padding-left: 7px;
    text-shadow: 0 1px 1px rgba(var(--accent-rgb), 0.1);
    box-shadow: inset 0 0 5px rgba(var(--accent-rgb), 0.05);
  }
`;

interface CustomSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const optionsContainerRef = useRef<HTMLDivElement>(null);

  // Convert our props format to the format expected by the original implementation
  const selectOptions: SelectOption[] = options.map((opt) => ({
    value: opt.value,
    text: opt.label,
    selected: opt.value === value,
  }));

  // Initialize and handle events (similar to the original implementation)
  useEffect(() => {
    const container = containerRef.current;
    const optionsContainer = optionsContainerRef.current;

    if (!container || !optionsContainer) return;

    const handleMouseEnter = () => {
      if (optionsContainer) {
        optionsContainer.style.display = "block";
      }
    };

    const handleMouseLeave = () => {
      setTimeout(() => {
        if (container && !container.matches(":hover") && optionsContainer) {
          optionsContainer.style.display = "none";
        }
      }, 100);
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Initial update of selected option
    updateSelectedUI();

    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Update when value changes from outside
  useEffect(() => {
    updateSelectedUI();
  }, [value]);

  const updateSelectedUI = () => {
    // With styled-components approach, this is mostly handled by props
    // but we keep it for compatibility with the existing code
    if (selectRef.current) {
      const selectedIndex = Array.from(selectRef.current.options).findIndex(
        (option) => option.value === value
      );

      selectRef.current.selectedIndex = selectedIndex;
    }
  };

  const handleOptionClick = (optionValue: string, index: number) => {
    onChange(optionValue);

    // Manually update the select element
    if (selectRef.current) {
      selectRef.current.selectedIndex = index;
      selectRef.current.dispatchEvent(new Event("change", { bubbles: true }));

      if (optionsContainerRef.current) {
        optionsContainerRef.current.style.display = "none";
      }
    }
  };

  return (
    <SelectContainer className={className} ref={containerRef} data-for={id}>
      <StyledSelect
        ref={selectRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {selectOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </StyledSelect>

      <OptionsContainer
        ref={optionsContainerRef}
        className="select-options"
        style={{ display: "none" }}
      >
        {selectOptions.map((option, index) => (
          <Option
            key={option.value}
            isSelected={option.selected}
            data-value={option.value}
            data-index={index.toString()}
            onClick={() => handleOptionClick(option.value, index)}
          >
            {option.text}
          </Option>
        ))}
      </OptionsContainer>
    </SelectContainer>
  );
};

export default CustomSelect;
