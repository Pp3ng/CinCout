// Define theme interfaces
interface TerminalColors {
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
}

interface Theme {
    name: string;
    bg: string;
    bgSecondary: string;
    text: string;
    textSecondary: string;
    accent: string;
    accentHover: string;
    border: string;
    cdnUrl?: string;
    terminal: TerminalColors;
}

interface TerminalTheme {
    background: string;
    foreground: string;
    cursor: string;
    cursorAccent: string;
    selection: string;
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
    brightBlack: string;
    brightRed: string;
    brightGreen: string;
    brightYellow: string;
    brightBlue: string;
    brightMagenta: string;
    brightCyan: string;
    brightWhite: string;
    [key: string]: string;
}

interface ThemeMap {
    [key: string]: Theme;
}

interface EditorInstance {
    instance: any;
    type: string;
}

// Theme definitions object
const themes: ThemeMap = {
    "default": {
        name: "Default",
        bg: "#ffffff",
        bgSecondary: "#f7f7f7",
        text: "#000000",
        textSecondary: "#999999",
        accent: "#0066cc",
        accentHover: "#0052a3",
        border: "#d1d1d1",
        terminal: {
            red: "#e01b1b",
            green: "#18a018",
            yellow: "#c7c329",
            blue: "#0066cc",
            magenta: "#cc00cc",
            cyan: "#00aaaa"
        }
    },
    "nord": {
        name: "Nord",
        bg: "#2e3440",
        bgSecondary: "#3b4252",
        text: "#eceff4",
        textSecondary: "#d8dee9",
        accent: "#5e81ac",
        accentHover: "#81a1c1",
        border: "#4c566a",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/nord.min.css",
        terminal: {
            red: "#bf616a",
            green: "#a3be8c",
            yellow: "#ebcb8b",
            blue: "#81a1c1",
            magenta: "#b48ead",
            cyan: "#88c0d0"
        }
    },
    "dracula": {
        name: "Dracula",
        bg: "#282a36",
        bgSecondary: "#44475a",
        text: "#f8f8f2",
        textSecondary: "#6272a4",
        accent: "#bd93f9",
        accentHover: "#ff79c6",
        border: "#6272a4",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/dracula.min.css",
        terminal: {
            red: "#ff5555",
            green: "#50fa7b",
            yellow: "#f1fa8c",
            blue: "#bd93f9",
            magenta: "#ff79c6",
            cyan: "#8be9fd"
        }
    },
    "monokai": {
        name: "Monokai",
        bg: "#272822",
        bgSecondary: "#3e3d32",
        text: "#f8f8f2",
        textSecondary: "#75715e",
        accent: "#a6e22e",
        accentHover: "#f92672",
        border: "#49483e",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/monokai.min.css",
        terminal: {
            red: "#f92672",
            green: "#a6e22e",
            yellow: "#f4bf75",
            blue: "#66d9ef",
            magenta: "#ae81ff",
            cyan: "#a1efe4"
        }
    },
    "material": {
        name: "Material",
        bg: "#263238",
        bgSecondary: "#37474f",
        text: "#eeffff",
        textSecondary: "#b0bec5",
        accent: "#89ddff",
        accentHover: "#80cbc4",
        border: "#546e7a",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/material.min.css",
        terminal: {
            red: "#f07178",
            green: "#c3e88d",
            yellow: "#ffcb6b",
            blue: "#82aaff",
            magenta: "#c792ea",
            cyan: "#89ddff"
        }
    },
    "ayu-dark": {
        name: "Ayu Dark",
        bg: "#0a0e14",
        bgSecondary: "#1f2430",
        text: "#e6e1cf",
        textSecondary: "#b3b1ad",
        accent: "#ffb454",
        accentHover: "#ff8f40",
        border: "#11151c",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/ayu-dark.min.css",
        terminal: {
            red: "#f07178",
            green: "#c2d94c",
            yellow: "#ffb454",
            blue: "#59c2ff",
            magenta: "#d2a6ff",
            cyan: "#95e6cb"
        }
    },
    "gruvbox-dark": {
        name: "Gruvbox Dark",
        bg: "#282828",
        bgSecondary: "#3c3836",
        text: "#ebdbb2",
        textSecondary: "#a89984",
        accent: "#b8bb26",
        accentHover: "#98971a",
        border: "#504945",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/gruvbox-dark.min.css",
        terminal: {
            red: "#fb4934",
            green: "#b8bb26",
            yellow: "#fabd2f",
            blue: "#83a598",
            magenta: "#d3869b",
            cyan: "#8ec07c"
        }
    },
    "seti": {
        name: "Seti",
        bg: "#151718",
        bgSecondary: "#1d1f20",
        text: "#cfd2d1",
        textSecondary: "#6d8086",
        accent: "#55b5db",
        accentHover: "#55dbbe",
        border: "#0e1112",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/seti.min.css",
        terminal: {
            red: "#cd3f45",
            green: "#9fca56",
            yellow: "#e6cd69",
            blue: "#55b5db",
            magenta: "#a074c4",
            cyan: "#55dbbe"
        }
    },
    "panda-syntax": {
        name: "Panda Syntax",
        bg: "#292a2b",
        bgSecondary: "#31353a",
        text: "#e6e6e6",
        textSecondary: "#9595a2",
        accent: "#19f9d8",
        accentHover: "#ffb86c",
        border: "#42424c",
        cdnUrl: "https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/theme/panda-syntax.min.css",
        terminal: {
            red: "#ff4b82",
            green: "#19f9d8",
            yellow: "#ffb86c",
            blue: "#45a9f9",
            magenta: "#ff75b5",
            cyan: "#6fc1ff"
        }
    }
};

// Theme Manager class - handles all theme-related functionality
class ThemeManager {
    private themeSelect: HTMLSelectElement | null = null;
    private currentTheme: string = 'default';
    private editorInstances: EditorInstance[] = []; // Track editor instances for theme updates
    private cssVarMap: {[key: string]: string} = {
        bg: '--bg-primary',
        bgSecondary: '--bg-secondary',
        text: '--text-primary',
        textSecondary: '--text-secondary',
        accent: '--accent',
        accentHover: '--accent-hover',
        border: '--border'
    };

    // Register an editor instance for theme updates
    public registerEditor(editorInstance: any, type: string = 'code'): void {
        if (editorInstance) {
            this.editorInstances.push({ instance: editorInstance, type });
        }
    }

    // Load theme CSS from CDN
    private loadThemeCSS(theme: Theme): void {
        if (!theme.cdnUrl) return;
        
        const existingLink = document.querySelector(`link[href="${theme.cdnUrl}"]`);
        if (!existingLink) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = theme.cdnUrl;
            document.head.appendChild(link);
        }
    }

    // Get computed CSS variable value
    private getCssVar(varName: string, fallback: string = ''): string {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(varName)
            .trim();
        return value || fallback;
    }

    // Get terminal theme configuration based on current theme
    public getTerminalTheme(): TerminalTheme {
        // Get the current theme data
        const themeData = themes[this.currentTheme] || themes["default"];
        
        // Default terminal colors - used when theme doesn't define specific colors
        const defaultTermColors: TerminalColors = {
            red: '#ff5555',
            green: '#50fa7b',
            yellow: '#f1fa8c',
            blue: '#bd93f9',
            magenta: '#ff79c6',
            cyan: '#8be9fd'
        };
        
        // Get theme-defined terminal colors or use defaults
        const terminalColors: TerminalColors = {
            ...defaultTermColors,
            ...(themeData.terminal || {})
        };
        
        // Get color values from CSS variables
        const cssVars: {[key: string]: string} = {
            background: this.getCssVar('--bg-primary'),
            foreground: this.getCssVar('--text-primary'),
            cursor: this.getCssVar('--accent'),
            cursorAccent: this.getCssVar('--bg-primary'),
            selection: this.getCssVar('--accent') + '40', // Add transparency
        };
        
        // Build complete terminal theme
        const theme: TerminalTheme = {
            // CSS variable colors
            ...cssVars,
            
            // Base colors
            black: '#000000',
            red: terminalColors.red,
            green: terminalColors.green,
            yellow: terminalColors.yellow,
            blue: terminalColors.blue,
            magenta: terminalColors.magenta,
            cyan: terminalColors.cyan,
            white: '#bfbfbf',
            
            // Bright variants
            brightBlack: '#4d4d4d',
            brightRed: '#ff6e67',
            brightGreen: '#5af78e',
            brightYellow: '#f4f99d',
            brightBlue: '#caa9fa',
            brightMagenta: '#ff92d0',
            brightCyan: '#9aedfe',
            brightWhite: '#e6e6e6'
        };
        
        return this.ensureHashPrefixes(theme);
    }

    // Ensure all color values have # prefix
    private ensureHashPrefixes(colorObject: {[key: string]: string}): {[key: string]: string} {
        return Object.fromEntries(
            Object.entries(colorObject).map(([key, value]) => {
                if (typeof value === 'string' && value.trim() !== '' && !value.startsWith('#')) {
                    return [key, '#' + value.trim()];
                }
                return [key, value];
            })
        );
    }

    // Set CSS variables from theme
    private setCssVariables(theme: Theme): void {
        const root = document.documentElement;
        
        // Set CSS variables using the mapping
        Object.entries(this.cssVarMap).forEach(([themeKey, cssVar]) => {
            if (theme[themeKey as keyof Theme]) {
                root.style.setProperty(cssVar, theme[themeKey as keyof Theme]);
            }
        });
    }

    // Update all editor instances with the theme
    private updateEditors(themeName: string): void {
        const isDefault = themeName === 'default';
        
        // Update registered editor instances
        this.editorInstances.forEach(({ instance, type }) => {
            instance.setOption('theme', isDefault ? 'default' : themeName);
        });
        
        // Maintain backwards compatibility
        if (typeof (window as any).editor !== 'undefined' && (window as any).editor) {
            (window as any).editor.setOption('theme', isDefault ? 'default' : themeName);
        }
        
        if (typeof (window as any).assemblyView !== 'undefined' && (window as any).assemblyView) {
            (window as any).assemblyView.setOption('theme', isDefault ? 'default' : themeName);
        }
    }

    // Apply theme to the application
    public applyTheme(themeName: string): void {
        const theme = themes[themeName];
        if (!theme) return;

        this.currentTheme = themeName;
        
        // Add transition class for smooth theme changes
        document.body.classList.add('theme-transitioning');

        // Load theme CSS if available
        if (theme.cdnUrl) {
            this.loadThemeCSS(theme);
        }

        // Apply theme in next animation frame for performance
        requestAnimationFrame(() => {
            // Set CSS variables
            this.setCssVariables(theme);
            
            // Update editor themes
            this.updateEditors(themeName);

            // Update terminal theme with a slight delay to ensure CSS variables are updated
            this.updateTerminal();

            // Save preference to local storage
            localStorage.setItem('preferred-theme', themeName);

            // Remove transition class after animation
            setTimeout(() => {
                document.body.classList.remove('theme-transitioning');
            }, 300);
        });
    }

    // Update terminal with current theme
    private updateTerminal(): void {
        if (typeof (window as any).terminal !== 'undefined' && (window as any).terminal) {
            setTimeout(() => {
                const terminalTheme = this.getTerminalTheme();
                (window as any).terminal.setOption('theme', terminalTheme);
                
                // Force terminal to redraw
                (window as any).terminal.refresh(0, (window as any).terminal.rows - 1);
            }, 50);
        }
    }

    // initialize theme selector dropdown
    private initializeThemeSelector(): void {
        this.themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
        if (!this.themeSelect) return;

        // Clear existing options
        this.themeSelect.innerHTML = '';

        // Add theme options
        Object.keys(themes).forEach(themeKey => {
            const option = document.createElement('option');
            option.value = themeKey;
            option.textContent = themes[themeKey].name;
            this.themeSelect.appendChild(option);
        });

        // Set selected theme from storage or default
        const savedTheme = localStorage.getItem('preferred-theme') || 'default';
        this.themeSelect.value = savedTheme;

        // Apply the saved theme
        this.applyTheme(savedTheme);

        // Add change event listener
        this.themeSelect.addEventListener('change', (e) => {
            this.applyTheme((e.target as HTMLSelectElement).value);
        });
    }

    // Preload all theme CSS files
    private preloadThemeCSS(): void {
        Object.values(themes).forEach(theme => {
            if (theme.cdnUrl) {
                this.loadThemeCSS(theme);
            }
        });
    }

    // Initialize the theme manager
    public initialize(): void {
        this.preloadThemeCSS();
        this.initializeThemeSelector();
        
        // Apply initial theme from storage or default
        const savedTheme = localStorage.getItem('preferred-theme') || 'default';
        this.applyTheme(savedTheme);
    }
}

// Create theme manager instance
const themeManager = new ThemeManager();

// Maintain compatibility with existing code
(window as any).getTerminalTheme = (): TerminalTheme => themeManager.getTerminalTheme();
(window as any).applyTheme = (themeName: string): void => themeManager.applyTheme(themeName);

// Initialize themes on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    themeManager.initialize();
});