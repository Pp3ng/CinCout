import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import styled, { keyframes } from "styled-components";
import { showNotification } from "../utils";
import CustomSelect from "./CustomSelect";
import { ShortcutDefinition } from "../types";
import { useTemplates } from "../hooks/useTemplates";
import { useTheme } from "../hooks/useTheme";

// Animation keyframes
const gradientShift = keyframes`
  0% {
    background-position: 0% 50%;
    text-shadow: 0 0 4px rgba(var(--accent-rgb), 0.2);
  }
  25% {
    text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.4);
  }
  50% {
    background-position: 100% 50%;
    text-shadow: 0 0 12px rgba(var(--accent-rgb), 0.3);
  }
  75% {
    text-shadow: 0 0 8px rgba(var(--accent-rgb), 0.4);
  }
  100% {
    background-position: 0% 50%;
    text-shadow: 0 0 4px rgba(var(--accent-rgb), 0.2);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const float = keyframes`
  0% {
    transform: translateY(0) rotate(0deg) scale(1.2);
  }
  100% {
    transform: translateY(-5px) rotate(10deg) scale(1.3);
  }
`;

// Styled components for the header layout
const HeaderContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  background: var(--bg-secondary);
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  gap: var(--spacing-sm);
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
`;

const Title = styled.h1`
  font-family: var(--font-mono);
  background: linear-gradient(
    45deg,
    var(--accent),
    var(--accent-hover),
    var(--accent),
    var(--accent-hover)
  );
  background-size: 300% 300%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.6em;
  margin: 0;
  letter-spacing: 0.4px;
  text-shadow: var(--shadow-accent-sm);
  animation: ${gradientShift} 8s ease-in-out infinite;
  white-space: nowrap;
  line-height: 1;
  display: flex;
  position: relative;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  height: auto;
  flex-wrap: wrap;
  min-width: 0;
`;

// Icon components
const GitHubIcon = styled.img`
  width: 26px;
  height: 26px;
  transition: transform 0.3s, opacity 0.3s;
  flex-shrink: 0;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);

  &:hover {
    opacity: 0.9;
    transform: scale(1.1);
  }
`;

const VimIcon = styled.img`
  transition: transform 0.3s, opacity 0.3s;
  flex-shrink: 0;

  &:hover {
    opacity: 0.9;
    transform: scale(1.1);
  }
`;

const ResourceIcon = styled.i`
  transition: all 0.3s ease;
  width: 16px;
  text-align: center;
`;

// Dropdown components
const DropdownContainer = styled.div`
  position: relative;
  display: inline-block;
  z-index: var(--z-dropdown);

  &:hover::after {
    display: block;
  }

  &::after {
    content: "";
    position: absolute;
    display: none;
    height: 20px;
    width: 100%;
    bottom: -20px;
    left: 0;
    z-index: calc(var(--z-dropdown) - 1);
  }
`;

const DropdownButton = styled.button`
  --btn-bg: var(--bg-secondary);
  --btn-shadow: var(--shadow-sm);
  --btn-shadow-hover: var(--shadow-accent-md);

  background: var(--btn-bg);
  color: var(--text-primary);
  border: 1px solid var(--border);
  padding: var(--btn-padding-y) var(--btn-padding-x);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-sm);
  display: flex;
  align-items: center;
  gap: var(--btn-gap);
  position: relative;
  overflow: hidden;
  box-shadow: var(--btn-shadow);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  transition: var(--btn-transition);

  & .fa-chevron-down {
    font-size: 0.7em;
    margin-left: 4px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  ${DropdownContainer}:hover & .fa-chevron-down {
    transform: rotate(180deg);
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:hover {
    border-color: var(--accent);
    background-color: rgba(var(--accent-rgb), 0.1);
    transform: translateY(var(--btn-hover-y));
    box-shadow: var(--btn-shadow-hover);
  }

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.05) 50%,
      transparent 50%,
      rgba(0, 0, 0, 0.05)
    );
    pointer-events: none;
    border-radius: inherit;
  }
`;

const DropdownContent = styled.div`
  display: none;
  font-family: var(--font-mono);
  position: absolute;
  background-color: var(--bg-secondary);
  min-width: 220px;
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-md);
  z-index: var(--z-dropdown);
  margin-top: 3px;
  animation: ${fadeIn} 0.3s ease;
  border: 1px solid var(--border);
  overflow: hidden;
  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.3s, transform 0.3s;
  pointer-events: none;

  &::before {
    content: "";
    position: absolute;
    top: -20px;
    left: 0;
    width: 100%;
    height: 20px;
  }

  ${DropdownContainer}:hover & {
    display: block;
    opacity: 1;
    transform: translateY(0);
    pointer-events: auto;
  }

  & a {
    position: relative;
    color: var(--text-primary);
    padding: 10px 12px;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: transform 0.3s ease, box-shadow 0.3s ease;

    &:hover {
      transform: translateY(-3px);
      box-shadow: var(--shadow-accent-sm);
    }

    &:active {
      transform: translateY(0);
      transition: transform 0.1s ease;
    }

    &:has(.resource-icon):hover {
      background-color: transparent;
    }

    &:hover .resource-icon {
      color: var(--accent);
      animation: ${float} 1s ease-in-out infinite alternate;
    }
  }
`;

// Shortcuts panel specific styling
const ShortcutsContainer = styled(DropdownContainer)`
  &.shortcuts-panel {
    position: relative;
    display: inline-block;
  }
`;

const ShortcutsContent = styled(DropdownContent)`
  &.shortcuts-content {
    min-width: 250px;
    max-width: 350px;
    padding: 6px;
    margin-top: 5px;
    font-size: var(--font-xs);
    transition: display var(--transition-slow), opacity var(--transition-normal);
  }

  & ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  & li {
    margin-bottom: 3px;
    padding: 3px 0;

    &:last-child {
      border-bottom: none;
    }
  }

  & kbd {
    background-color: var(--bg-primary);
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    color: var(--accent);
    display: inline-block;
    font-size: 0.85em;
    font-family: var(--font-mono);
    font-weight: 600;
    line-height: 1.2;
    padding: 2px 4px;
    white-space: nowrap;
    margin: 0 2px;
    border: 1px solid var(--glass-border);
    transition: all var(--transition-fast);
    transform: translateY(0);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
  }
`;

// Vim toggle switch styled components
const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  height: 24px; /* var(--btn-height) */
  flex-shrink: 0;
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 34px;
  height: 18px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
`;

const Slider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 2px;
    bottom: 2px;
    background-color: var(--text-primary);
    border-radius: 50%;
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  ${ToggleInput}:checked + & {
    background-color: var(--accent);
    box-shadow: var(--shadow-accent-sm), inset 0 0 4px rgba(0, 0, 0, 0.2);
  }

  ${ToggleInput}:checked + &:before {
    transform: translateX(16px);
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
    background-color: #fff;
  }
`;

// Type for learning resources
interface LearningResource {
  href: string;
  icon: string;
  label: string;
}

interface HeaderProps {
  // Props that allow interaction with existing non-React code
  onLanguageChange?: (language: string) => void;
  onCompilerChange?: (compiler: string) => void;
  onOptimizationChange?: (optimization: string) => void;
  onVimModeToggle?: (enabled: boolean) => void;

  // Initial values
  initialLanguage?: string;
  initialCompiler?: string;
  initialOptimization?: string;
  initialVimMode?: boolean;

  // Shortcuts data from ShortcutService
  shortcuts?: ShortcutDefinition[];
}

const LEARNING_RESOURCES: LearningResource[] = [
  {
    href: "https://www.gnu.org/software/gnu-c-manual/gnu-c-manual.html",
    icon: "fas fa-file-alt",
    label: "GNU C Manual",
  },
  {
    href: "https://sourceware.org/gdb/documentation/",
    icon: "fas fa-bug",
    label: "GDB Documentation",
  },
  {
    href: "https://github.com/Pp3ng/My-bookshelf/raw/main/The%20C++%20Programming%20Language-4th.pdf",
    icon: "fas fa-book-open",
    label: "The C++ Programming Language",
  },
  {
    href: "https://en.cppreference.com/w/",
    icon: "fas fa-code",
    label: "Cpp Reference",
  },
  {
    href: "https://hackingcpp.com/",
    icon: "fas fa-laptop-code",
    label: "Hacking Cpp",
  },
];

const Header: React.FC<HeaderProps> = ({
  onLanguageChange,
  onCompilerChange,
  onOptimizationChange,
  onVimModeToggle,
  initialLanguage = "c",
  initialCompiler = "gcc",
  initialOptimization = "-O0",
  initialVimMode = false,
  shortcuts = [],
}) => {
  // Use theme hook
  const { theme, setTheme, getThemeOptions } = useTheme();

  // Use templates hook
  const {
    language,
    setLanguage,
    templates,
    selectedTemplate,
    setSelectedTemplate,
  } = useTemplates(initialLanguage);

  // State for all form controls
  const [compiler, setCompiler] = useState(initialCompiler);
  const [optimization, setOptimization] = useState(initialOptimization);
  const [vimMode, setVimMode] = useState(initialVimMode);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // References for dropdown containers
  const learnDropdownRef = useRef<HTMLDivElement>(null);
  const shortcutsDropdownRef = useRef<HTMLDivElement>(null);

  // Effect to handle Vim mode initialization
  useEffect(() => {
    // Check local storage for saved preference
    const savedVimMode = localStorage.getItem("cincout-vim-mode") === "true";

    // Update state if different from prop
    if (savedVimMode !== initialVimMode) {
      setVimMode(savedVimMode);
      if (onVimModeToggle) onVimModeToggle(savedVimMode);
    }

    // Set editor option directly (this will be removed once full React migration is complete)
    const setEditorVimMode = (enabled: boolean) => {
      if ((window as any).editor) {
        (window as any).editor.setOption("keyMap", enabled ? "vim" : "default");
      }
    };

    setEditorVimMode(savedVimMode || initialVimMode);
  }, [initialVimMode, onVimModeToggle]);

  // Memoized select options to prevent unnecessary re-renders
  const languageOptions = useMemo(
    () => [
      { value: "c", label: "C" },
      { value: "cpp", label: "C++" },
    ],
    []
  );

  const compilerOptions = useMemo(
    () => [
      { value: "gcc", label: "GCC" },
      { value: "clang", label: "Clang" },
    ],
    []
  );

  const optimizationOptions = useMemo(
    () => [
      { value: "-O0", label: "-O0 (No optimization)" },
      { value: "-O1", label: "-O1 (Basic optimization)" },
      { value: "-O2", label: "-O2 (Moderate optimization)" },
      { value: "-O3", label: "-O3 (Maximum optimization)" },
      { value: "-Os", label: "-Os (Size optimization)" },
    ],
    []
  );

  const themeOptions = useMemo(() => getThemeOptions(), [getThemeOptions]);

  // Event handlers with useCallback to prevent unnecessary re-renders
  const handleLanguageChange = useCallback(
    (value: string) => {
      setLanguage(value);
      if (onLanguageChange) onLanguageChange(value);
    },
    [setLanguage, onLanguageChange]
  );

  const handleCompilerChange = useCallback(
    (value: string) => {
      setCompiler(value);
      if (onCompilerChange) onCompilerChange(value);
    },
    [onCompilerChange]
  );

  const handleOptimizationChange = useCallback(
    (value: string) => {
      setOptimization(value);
      if (onOptimizationChange) onOptimizationChange(value);
    },
    [onOptimizationChange]
  );

  const handleTemplateChange = useCallback(
    (value: string) => {
      setSelectedTemplate(value);
    },
    [setSelectedTemplate]
  );

  const handleThemeChange = useCallback(
    (value: string) => {
      setTheme(value);
    },
    [setTheme]
  );

  const handleVimModeToggle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const enabled = e.target.checked;

      // Update local state
      setVimMode(enabled);

      // Save to localStorage for persistence
      localStorage.setItem("cincout-vim-mode", enabled.toString());

      // Update editor directly (this will be removed once full React migration is complete)
      if ((window as any).editor) {
        (window as any).editor.setOption("keyMap", enabled ? "vim" : "default");
      }

      // Call prop callback if provided
      if (onVimModeToggle) onVimModeToggle(enabled);
    },
    [onVimModeToggle]
  );

  const handleTitleClick = useCallback(() => {
    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime > 1500) {
      setClickCount(0);
    }

    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setLastClickTime(currentTime);

    // easter egg: show a notification after 3 clicks
    if (newClickCount >= 2) {
      showNotification(
        "info",
        "🌌 The Answer to the Ultimate Question of Life, the Universe, and Everything is 42 🚀",
        4000,
        { top: "50%", left: "50%" }
      );
    }
  }, [clickCount, lastClickTime]);

  // Memoized shortcut list render function
  const renderShortcutsList = useMemo(() => {
    if (!shortcuts.length) return null;

    return (
      <ul>
        {shortcuts.map((shortcut, index) => (
          <li key={index}>
            {shortcut.displayKeys
              .map((key, i) => <kbd key={i}>{key}</kbd>)
              .reduce((prev, curr) => (
                <>
                  {prev} + {curr}
                </>
              ))}{" "}
            - {shortcut.description}
          </li>
        ))}
      </ul>
    );
  }, [shortcuts]);

  // Render learning resources
  const renderLearningResources = useMemo(
    () =>
      LEARNING_RESOURCES.map((resource, index) => (
        <a href={resource.href} target="_blank" key={index}>
          <ResourceIcon
            className={`${resource.icon} resource-icon`}
          ></ResourceIcon>{" "}
          {resource.label}
        </a>
      )),
    []
  );

  return (
    <>
      <HeaderContainer>
        <HeaderLeft>
          <Title id="title-easter-egg" onClick={handleTitleClick}>
            <i className="devicon-c-plain"></i>
            <i className="devicon-cplusplus-plain"></i> CinCout
          </Title>

          {/* Learn dropdown */}
          <DropdownContainer
            className="dropdown"
            id="learn-dropdown"
            ref={learnDropdownRef}
          >
            <DropdownButton
              id="learn-cpp-btn"
              className="header-btn dropdown-btn"
            >
              <i className="fas fa-book"></i> Learn
              <i className="fas fa-chevron-down"></i>
            </DropdownButton>
            <DropdownContent
              className="dropdown-content"
              id="learn-dropdown-content"
            >
              {renderLearningResources}
            </DropdownContent>
          </DropdownContainer>

          {/* Shortcuts dropdown */}
          <ShortcutsContainer
            id="shortcuts-panel"
            className="shortcuts-panel dropdown"
            ref={shortcutsDropdownRef}
          >
            <DropdownButton
              id="toggle-shortcuts"
              className="header-btn dropdown-btn"
            >
              <i className="fas fa-keyboard"></i> Shortcuts
              <i className="fas fa-chevron-down"></i>
            </DropdownButton>
            <ShortcutsContent
              className="shortcuts-content dropdown-content"
              id="shortcuts-content"
            >
              {renderShortcutsList}
            </ShortcutsContent>
          </ShortcutsContainer>
        </HeaderLeft>

        <ControlsContainer>
          <CustomSelect
            id="language"
            value={language}
            onChange={handleLanguageChange}
            options={languageOptions}
          />

          <CustomSelect
            id="compiler"
            value={compiler}
            onChange={handleCompilerChange}
            options={compilerOptions}
          />

          <CustomSelect
            id="optimization"
            value={optimization}
            onChange={handleOptimizationChange}
            options={optimizationOptions}
          />

          <CustomSelect
            id="template"
            value={selectedTemplate}
            onChange={handleTemplateChange}
            options={templates}
          />

          <CustomSelect
            id="theme-select"
            value={theme}
            onChange={handleThemeChange}
            options={themeOptions}
          />

          <ToggleContainer>
            <a href="https://www.vim.org" target="_blank">
              <VimIcon
                src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vim/vim-original.svg"
                alt="Vim"
                title="Vim Mode"
                width="20"
                height="20"
                style={{ marginRight: "4px" }}
              />
            </a>
            <ToggleSwitch>
              <ToggleInput
                type="checkbox"
                id="vimMode"
                checked={vimMode}
                onChange={handleVimModeToggle}
              />
              <Slider />
            </ToggleSwitch>
          </ToggleContainer>

          <a href="https://github.com/Pp3ng/CinCout" target="_blank">
            <GitHubIcon
              src="https://github.com/fluidicon.png"
              alt="GitHub"
              className="github-icon"
            />
          </a>
        </ControlsContainer>
      </HeaderContainer>
    </>
  );
};

export default Header;
