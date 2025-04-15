// No need to import libraries already loaded via CDN

// Import CSS
import "../css/base.css";
import "../css/buttons.css";
import "../css/components.css";
import "../css/layout.css";
import "../css/memcheck.css";
import "../css/responsive.css";
import "../css/select.css";
import "../css/terminal.css";
import "../css/utils.css";

// Import all application modules in dependency order
import "./themes"; // Theme functionality
import "./templates"; // Code templates
import "./layout"; // Layout management
import "./selector"; // UI selection handling
import "./shortcuts"; // Keyboard shortcuts
import "./websocket"; // WebSocket communication
import "./handlers"; // Event handlers
import "./editor"; // Main editor functionality (depends on most other modules)
