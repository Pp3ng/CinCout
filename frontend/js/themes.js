const themes = {
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

// Load theme CSS from CDN
function loadThemeCSS(theme) {
    const existingLink = document.querySelector(`link[href="${theme.cdnUrl}"]`);
    if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = theme.cdnUrl;
        document.head.appendChild(link);
    }
}

// Get terminal theme - ensure this function works correctly
function getTerminalTheme() {
    // Get the current theme name
    const currentTheme = document.getElementById('theme-select').value;
    const themeData = themes[currentTheme] || themes["default"];
    
    // Build the theme object
    let theme = {
        // Use CSS variables as primary colors
        background: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim(),
        foreground: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim(),
        cursor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
        cursorAccent: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim(),
        selection: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() + '40', // Add transparency
        
        // Basic colors - get directly from theme object
        black: '#000000',
        red: themeData.terminal?.red || '#ff5555',
        green: themeData.terminal?.green || '#50fa7b',
        yellow: themeData.terminal?.yellow || '#f1fa8c',
        blue: themeData.terminal?.blue || '#bd93f9',
        magenta: themeData.terminal?.magenta || '#ff79c6',
        cyan: themeData.terminal?.cyan || '#8be9fd',
        white: '#bfbfbf',
        brightBlack: '#4d4d4d',
        brightRed: '#ff6e67',
        brightGreen: '#5af78e',
        brightYellow: '#f4f99d',
        brightBlue: '#caa9fa',
        brightMagenta: '#ff92d0',
        brightCyan: '#9aedfe',
        brightWhite: '#e6e6e6'
    };
    
    // Ensure all color values have # prefix
    Object.keys(theme).forEach(key => {
        if (typeof theme[key] === 'string' && theme[key].trim() !== '' && !theme[key].startsWith('#')) {
            theme[key] = '#' + theme[key].trim();
        }
    });
    
    return theme;
}

// Modify theme application function to ensure it correctly applies terminal theme
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;

    //transition class
    document.body.classList.add('theme-transitioning');

    // Load theme CSS
    if (theme.cdnUrl) {
        loadThemeCSS(theme);
    }

    //smooth transition
    requestAnimationFrame(() => {
        const root = document.documentElement;
        const {bg, bgSecondary, text, textSecondary, accent, accentHover, border} = theme;

        //Set property
        root.style.setProperty('--bg-primary', bg);
        root.style.setProperty('--bg-secondary', bgSecondary);
        root.style.setProperty('--text-primary', text);
        root.style.setProperty('--text-secondary', textSecondary);
        root.style.setProperty('--accent', accent);
        root.style.setProperty('--accent-hover', accentHover);
        root.style.setProperty('--border', border);

        // Ensure editor theme exists and apply it
        if (typeof editor !== 'undefined' && editor) {
            editor.setOption('theme', themeName === 'default' ? 'default' : themeName);
        }
        if (typeof assemblyView !== 'undefined' && assemblyView) {
            assemblyView.setOption('theme', themeName === 'default' ? 'default' : themeName);
        }

        // Update terminal theme - ensure getting the latest theme configuration
        if (typeof terminal !== 'undefined' && terminal) {
            // Refresh computed styles before applying
            setTimeout(() => {
                const terminalTheme = getTerminalTheme();
                terminal.setOption('theme', terminalTheme);
                
                // Force terminal to redraw
                terminal.refresh(0, terminal.rows - 1);
                console.log('Applied terminal theme:', terminalTheme);
            }, 50); // Short delay to ensure CSS variables are updated
        }

        // Local storage
        localStorage.setItem('preferred-theme', themeName);

        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
    });
}

function initializeThemeSelector() {
    const themeSelect = document.getElementById('theme-select');

    themeSelect.innerHTML = '';

    Object.keys(themes).forEach(themeKey => {
        const option = document.createElement('option');
        option.value = themeKey;
        option.textContent = themes[themeKey].name;
        themeSelect.appendChild(option);
    });

    const savedTheme = localStorage.getItem('preferred-theme') || 'default';
    themeSelect.value = savedTheme;

    applyTheme(savedTheme);

    themeSelect.addEventListener('change', (e) => {
        applyTheme(e.target.value);
    });
}

window.getTerminalTheme = getTerminalTheme;
window.applyTheme = applyTheme;

// Initialize themes
document.addEventListener('DOMContentLoaded', function() {
    // Load theme CSS from CDN
    Object.values(themes).forEach(theme => {
        if (theme.cdnUrl) {
            loadThemeCSS(theme);
        }
    });
    
    initializeThemeSelector();
});