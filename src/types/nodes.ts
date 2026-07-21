// Types for test automation nodes
export type NodeCategory = 'trigger' | 'action' | 'assertion' | 'control' | 'hook';

// Global project configuration
export interface ProjectConfig {
  executionMode: 'default' | 'parallel' | 'serial';
  workers: number;
  maxFailures: number;
  retries: number;
  timeout: number;
  cdpUrl?: string; // URL to connect via CDP and view execution
}

export const defaultProjectConfig: ProjectConfig = {
  executionMode: 'default',
  workers: 4,
  maxFailures: 0,
  retries: 0,
  timeout: 30000,
  cdpUrl: '',
};

export interface NodeTypeDefinition {
  id: string;
  label: string;
  category: NodeCategory;
  description: string;
  fields: NodeField[];
}

export interface NodeField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea' | 'boolean' | 'tags';
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  placeholder?: string;
  required?: boolean;
  group?: string; // Collapsible group the field belongs to
  dependsOn?: { field: string; value: unknown }; // Field it depends on to show
}

// Definition of all available node types
export const nodeTypes: NodeTypeDefinition[] = [
  // Triggers
  {
    id: 'start',
    label: 'Start',
    category: 'trigger',
    description: 'Starting point of the test flow',
    fields: [
      // Basic fields
      {
        name: 'testName',
        label: 'Test Name',
        type: 'text',
        placeholder: 'My login test',
      },
      {
        name: 'tags',
        label: 'Tags',
        type: 'tags',
        placeholder: '@smoke, @critical, @regression',
      },
      {
        name: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        placeholder: 'https://example.com',
        required: true,
      },
      // ponytail: headless removed - always headless, user sees via screencast/CDP
      // Advanced options - Device emulation
      {
        name: 'device',
        label: 'Emulate Device',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'None (Desktop)' },
          { value: 'Pixel 5', label: 'Pixel 5' },
          { value: 'Pixel 7', label: 'Pixel 7' },
          { value: 'iPhone 12', label: 'iPhone 12' },
          { value: 'iPhone 13', label: 'iPhone 13' },
          { value: 'iPhone 14', label: 'iPhone 14' },
          { value: 'iPhone 14 Pro Max', label: 'iPhone 14 Pro Max' },
          { value: 'iPad Mini', label: 'iPad Mini' },
          { value: 'iPad Pro 11', label: 'iPad Pro 11' },
          { value: 'Galaxy S9+', label: 'Galaxy S9+' },
          { value: 'Galaxy Tab S4', label: 'Galaxy Tab S4' },
        ],
        defaultValue: '',
      },
      // Advanced options - Viewport
      {
        name: 'viewportWidth',
        label: 'Viewport Width',
        type: 'number',
        group: 'emulation',
        placeholder: '1280',
        defaultValue: 1280,
      },
      {
        name: 'viewportHeight',
        label: 'Viewport Height',
        type: 'number',
        group: 'emulation',
        placeholder: '720',
        defaultValue: 720,
      },
      {
        name: 'deviceScaleFactor',
        label: 'Scale Factor',
        type: 'number',
        group: 'emulation',
        placeholder: '1',
        defaultValue: 1,
      },
      {
        name: 'isMobile',
        label: 'Is Mobile',
        type: 'boolean',
        group: 'emulation',
        defaultValue: false,
      },
      {
        name: 'hasTouch',
        label: 'Touch Screen',
        type: 'boolean',
        group: 'emulation',
        defaultValue: false,
      },
      // Advanced options - Localization
      {
        name: 'locale',
        label: 'Locale/Region',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Default' },
          { value: 'en-US', label: 'English (US)' },
          { value: 'en-GB', label: 'English (UK)' },
          { value: 'es-ES', label: 'Español (España)' },
          { value: 'es-MX', label: 'Español (México)' },
          { value: 'es-CO', label: 'Español (Colombia)' },
          { value: 'pt-BR', label: 'Português (Brasil)' },
          { value: 'fr-FR', label: 'Français' },
          { value: 'de-DE', label: 'Deutsch' },
          { value: 'it-IT', label: 'Italiano' },
          { value: 'ja-JP', label: '日本語' },
          { value: 'ko-KR', label: '한국어' },
          { value: 'zh-CN', label: '中文 (简体)' },
        ],
        defaultValue: '',
      },
      {
        name: 'timezoneId',
        label: 'Timezone',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Default' },
          { value: 'America/New_York', label: 'New York (EST)' },
          { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
          { value: 'America/Chicago', label: 'Chicago (CST)' },
          { value: 'America/Bogota', label: 'Bogotá (COT)' },
          { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
          { value: 'America/Sao_Paulo', label: 'São Paulo' },
          { value: 'Europe/London', label: 'London (GMT)' },
          { value: 'Europe/Paris', label: 'Paris (CET)' },
          { value: 'Europe/Madrid', label: 'Madrid (CET)' },
          { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
          { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
          { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
        ],
        defaultValue: '',
      },
      // Advanced options - Geolocation
      {
        name: 'geoLatitude',
        label: 'Latitude',
        type: 'text',
        group: 'emulation',
        placeholder: '4.6097',
      },
      {
        name: 'geoLongitude',
        label: 'Longitude',
        type: 'text',
        group: 'emulation',
        placeholder: '-74.0817',
      },
      {
        name: 'geoAccuracy',
        label: 'Geo Accuracy (meters)',
        type: 'number',
        group: 'emulation',
        placeholder: '100',
      },
      // Advanced options - Appearance and behavior
      {
        name: 'colorScheme',
        label: 'Color Scheme',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Default' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'no-preference', label: 'No preference' },
        ],
        defaultValue: '',
      },
      {
        name: 'reducedMotion',
        label: 'Reduce Motion',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Default' },
          { value: 'reduce', label: 'Reduce' },
          { value: 'no-preference', label: 'No preference' },
        ],
        defaultValue: '',
      },
      {
        name: 'forcedColors',
        label: 'Forced Colors',
        type: 'select',
        group: 'emulation',
        options: [
          { value: '', label: 'Default' },
          { value: 'active', label: 'Active' },
          { value: 'none', label: 'None' },
        ],
        defaultValue: '',
      },
      // Advanced options - Network and JS
      {
        name: 'offline',
        label: 'Offline Mode',
        type: 'boolean',
        group: 'emulation',
        defaultValue: false,
      },
      {
        name: 'javaScriptEnabled',
        label: 'JavaScript Enabled',
        type: 'boolean',
        group: 'emulation',
        defaultValue: true,
      },
      // Advanced options - User Agent
      {
        name: 'userAgent',
        label: 'Custom User Agent',
        type: 'textarea',
        group: 'emulation',
        placeholder: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...',
      },
      // Advanced options - Permissions
      {
        name: 'permissions',
        label: 'Browser Permissions',
        type: 'tags',
        group: 'emulation',
        placeholder: 'geolocation, notifications, camera',
      },
    ],
  },

  // Actions - Navigation
  {
    id: 'navigate',
    label: 'Navigate',
    category: 'action',
    description: 'Navigates to a specific URL',
    fields: [
      {
        name: 'url',
        label: 'URL',
        type: 'text',
        placeholder: '/path or https://...',
        required: true,
      },
      {
        name: 'waitUntil',
        label: 'Wait until',
        type: 'select',
        options: [
          { value: 'load', label: 'Full load' },
          { value: 'domcontentloaded', label: 'DOM loaded' },
          { value: 'networkidle', label: 'Network idle' },
        ],
        defaultValue: 'load',
      },
    ],
  },

  // Actions - Clicks
  {
    id: 'click',
    label: 'Click',
    category: 'action',
    description: 'Clicks on an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#id, .class, button[type="submit"]',
        required: true,
      },
      {
        name: 'button',
        label: 'Mouse button',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'middle', label: 'Middle' },
        ],
        defaultValue: 'left',
      },
      {
        name: 'clickCount',
        label: 'Click count',
        type: 'number',
        defaultValue: 1,
      },
      {
        name: 'delay',
        label: 'Delay between mousedown/mouseup (ms)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Checkbox
  {
    id: 'check',
    label: 'Check/Uncheck Checkbox',
    category: 'action',
    description: 'Checks or unchecks a checkbox',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[type="checkbox"]',
        required: true,
      },
      {
        name: 'action',
        label: 'Action',
        type: 'select',
        options: [
          { value: 'check', label: 'Check' },
          { value: 'uncheck', label: 'Uncheck' },
        ],
        defaultValue: 'check',
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Typing
  {
    id: 'type',
    label: 'Type Text',
    category: 'action',
    description: 'Types text in a field',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[name="email"]',
        required: true,
      },
      {
        name: 'text',
        label: 'Text',
        type: 'text',
        placeholder: 'Text to type...',
        required: true,
      },
      {
        name: 'clearFirst',
        label: 'Clear first',
        type: 'boolean',
        defaultValue: true,
      },
      {
        name: 'delay',
        label: 'Delay between keys (ms)',
        type: 'number',
        defaultValue: 0,
      },
    ],
  },

  // Actions - Fill (faster than type)
  {
    id: 'fill',
    label: 'Fill Field',
    category: 'action',
    description: 'Fills a field instantly',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[name="email"]',
        required: true,
      },
      {
        name: 'value',
        label: 'Value',
        type: 'text',
        placeholder: 'value to insert',
        required: true,
      },
    ],
  },

  // Actions - Select
  {
    id: 'select',
    label: 'Select Option',
    category: 'action',
    description: 'Selects an option from a dropdown',
    fields: [
      {
        name: 'selector',
        label: 'Select selector',
        type: 'text',
        placeholder: 'select#pais',
        required: true,
      },
      {
        name: 'value',
        label: 'Value',
        type: 'text',
        placeholder: 'option value',
        required: true,
      },
      {
        name: 'selectBy',
        label: 'Select by',
        type: 'select',
        options: [
          { value: 'value', label: 'Value' },
          { value: 'label', label: 'Visible label' },
          { value: 'index', label: 'Index' },
        ],
        defaultValue: 'value',
      },
    ],
  },

  // Actions - Hover
  {
    id: 'hover',
    label: 'Hover',
    category: 'action',
    description: 'Hovers over an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.menu-item',
        required: true,
      },
    ],
  },

  // Actions - Wait
  {
    id: 'wait',
    label: 'Wait',
    category: 'action',
    description: 'Waits for a time or condition',
    fields: [
      {
        name: 'waitType',
        label: 'Wait type',
        type: 'select',
        options: [
          { value: 'time', label: 'Fixed time' },
          { value: 'selector', label: 'Element visible' },
          { value: 'hidden', label: 'Element hidden' },
          { value: 'networkidle', label: 'Network idle' },
        ],
        defaultValue: 'time',
      },
      {
        name: 'value',
        label: 'Value (ms or selector)',
        type: 'text',
        placeholder: '1000 or #element',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Screenshot
  {
    id: 'screenshot',
    label: 'Screenshot',
    category: 'action',
    description: 'Takes a screenshot',
    fields: [
      {
        name: 'name',
        label: 'File name',
        type: 'text',
        placeholder: 'captura-login',
        required: true,
      },
      {
        name: 'fullPage',
        label: 'Full page',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'selector',
        label: 'Selector (optional)',
        type: 'text',
        placeholder: 'Capture only this element',
        dependsOn: { field: 'fullPage', value: false },
      },
    ],
  },

  // Actions - Double Click
  {
    id: 'dblclick',
    label: 'Double Click',
    category: 'action',
    description: 'Double clicks on an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#id, .class, button',
        required: true,
      },
      {
        name: 'button',
        label: 'Mouse button',
        type: 'select',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'right', label: 'Right' },
          { value: 'middle', label: 'Middle' },
        ],
        defaultValue: 'left',
      },
      {
        name: 'delay',
        label: 'Delay between clicks (ms)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Clear
  {
    id: 'clear',
    label: 'Clear Field',
    category: 'action',
    description: 'Clears the content of an input field',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Blur
  {
    id: 'blur',
    label: 'Remove Focus',
    category: 'action',
    description: 'Removes focus from an element (blur)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#field',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Focus
  {
    id: 'focus',
    label: 'Focus Element',
    category: 'action',
    description: 'Focuses an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#field',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Press Key
  {
    id: 'press',
    label: 'Press Key',
    category: 'action',
    description: 'Presses a key or key combination',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#busqueda',
        required: true,
      },
      {
        name: 'key',
        label: 'Key',
        type: 'select',
        options: [
          { value: 'Enter', label: 'Enter' },
          { value: 'Tab', label: 'Tab' },
          { value: 'Escape', label: 'Escape' },
          { value: 'Backspace', label: 'Backspace' },
          { value: 'Delete', label: 'Delete' },
          { value: 'ArrowUp', label: 'Arrow Up' },
          { value: 'ArrowDown', label: 'Arrow Down' },
          { value: 'ArrowLeft', label: 'Arrow Left' },
          { value: 'ArrowRight', label: 'Arrow Right' },
          { value: 'Home', label: 'Home' },
          { value: 'End', label: 'End' },
          { value: 'PageUp', label: 'Page Up' },
          { value: 'PageDown', label: 'Page Down' },
          { value: 'Control+a', label: 'Ctrl+A (Select all)' },
          { value: 'Control+c', label: 'Ctrl+C (Copy)' },
          { value: 'Control+v', label: 'Ctrl+V (Paste)' },
          { value: 'Control+z', label: 'Ctrl+Z (Undo)' },
          { value: 'Control+s', label: 'Ctrl+S (Save)' },
          { value: 'F1', label: 'F1' },
          { value: 'F5', label: 'F5' },
          { value: 'F12', label: 'F12' },
        ],
        defaultValue: 'Enter',
      },
      {
        name: 'customKey',
        label: 'Custom key (optional)',
        type: 'text',
        placeholder: 'Shift+Control+a',
      },
      {
        name: 'delay',
        label: 'Delay (ms)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Press Sequentially (Type character by character)
  {
    id: 'pressSequentially',
    label: 'Type Sequentially',
    category: 'action',
    description: 'Types text character by character (simulates real typing)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#usuario',
        required: true,
      },
      {
        name: 'text',
        label: 'Text',
        type: 'text',
        placeholder: 'Text to type...',
        required: true,
      },
      {
        name: 'delay',
        label: 'Delay between keys (ms)',
        type: 'number',
        defaultValue: 50,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Select Text
  {
    id: 'selectText',
    label: 'Select Text',
    category: 'action',
    description: 'Selects all text in an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#field, textarea',
        required: true,
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Set Input Files (Upload)
  {
    id: 'setInputFiles',
    label: 'Upload File',
    category: 'action',
    description: 'Uploads one or more files to a file input',
    fields: [
      {
        name: 'selector',
        label: 'File input selector',
        type: 'text',
        placeholder: 'input[type="file"]',
        required: true,
      },
      {
        name: 'filePath',
        label: 'File path',
        type: 'text',
        placeholder: '/path/to/file.pdf',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Tap (Mobile)
  {
    id: 'tap',
    label: 'Tap (Mobile)',
    category: 'action',
    description: 'Performs a tap on an element (for touch devices)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button.submit',
        required: true,
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Drag and Drop
  {
    id: 'dragTo',
    label: 'Drag and Drop',
    category: 'action',
    description: 'Drags an element to another',
    fields: [
      {
        name: 'sourceSelector',
        label: 'Source selector',
        type: 'text',
        placeholder: '#element-to-drag',
        required: true,
      },
      {
        name: 'targetSelector',
        label: 'Target selector',
        type: 'text',
        placeholder: '#drop-zone',
        required: true,
      },
      {
        name: 'force',
        label: 'Force (skip checks)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Scroll Into View
  {
    id: 'scrollIntoView',
    label: 'Scroll',
    category: 'action',
    description: 'Scrolls until the element is visible',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#element-below',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Dispatch Event
  {
    id: 'dispatchEvent',
    label: 'Dispatch Event',
    category: 'action',
    description: 'Dispatches a DOM event programmatically',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#element',
        required: true,
      },
      {
        name: 'eventType',
        label: 'Event type',
        type: 'select',
        options: [
          { value: 'click', label: 'click' },
          { value: 'dblclick', label: 'dblclick' },
          { value: 'mousedown', label: 'mousedown' },
          { value: 'mouseup', label: 'mouseup' },
          { value: 'mouseover', label: 'mouseover' },
          { value: 'mouseout', label: 'mouseout' },
          { value: 'focus', label: 'focus' },
          { value: 'blur', label: 'blur' },
          { value: 'input', label: 'input' },
          { value: 'change', label: 'change' },
          { value: 'submit', label: 'submit' },
          { value: 'keydown', label: 'keydown' },
          { value: 'keyup', label: 'keyup' },
          { value: 'keypress', label: 'keypress' },
          { value: 'dragstart', label: 'dragstart' },
          { value: 'dragend', label: 'dragend' },
          { value: 'drop', label: 'drop' },
        ],
        defaultValue: 'click',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Wait For Element
  {
    id: 'waitFor',
    label: 'Wait For Element',
    category: 'action',
    description: 'Waits until the element meets a condition',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#element',
        required: true,
      },
      {
        name: 'state',
        label: 'Expected state',
        type: 'select',
        options: [
          { value: 'visible', label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'attached', label: 'En el DOM' },
          { value: 'detached', label: 'Fuera del DOM' },
        ],
        defaultValue: 'visible',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Get Attribute (for use with variables)
  {
    id: 'getAttribute',
    label: 'Get Attribute',
    category: 'action',
    description: 'Gets the value of an attribute from an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'a#link',
        required: true,
      },
      {
        name: 'attribute',
        label: 'Attribute name',
        type: 'text',
        placeholder: 'href, class, data-id',
        required: true,
      },
      {
        name: 'variableName',
        label: 'Save to variable',
        type: 'text',
        placeholder: 'myVariable',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Get Input Value
  {
    id: 'inputValue',
    label: 'Get Input Value',
    category: 'action',
    description: 'Gets the current value of an input field',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'variableName',
        label: 'Save to variable',
        type: 'text',
        placeholder: 'valorEmail',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Actions - Get Text Content
  {
    id: 'textContent',
    label: 'Get Text',
    category: 'action',
    description: 'Gets the text content of an element',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'span.message',
        required: true,
      },
      {
        name: 'variableName',
        label: 'Save to variable',
        type: 'text',
        placeholder: 'messageText',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 30000,
      },
    ],
  },

  // Assertions
  {
    id: 'assertVisible',
    label: 'Verify Visible',
    category: 'assertion',
    description: 'Verifies that an element is visible (toBeVisible)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.success-message',
        required: true,
      },
      {
        name: 'negate',
        label: 'Negate (NOT visible)',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertHidden',
    label: 'Verify Hidden',
    category: 'assertion',
    description: 'Verifies that an element is hidden (toBeHidden)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.modal-cerrado',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAttached',
    label: 'Verify In DOM',
    category: 'assertion',
    description: 'Verifies that an element is in the DOM (toBeAttached)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '#component',
        required: true,
      },
      {
        name: 'attached',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'true', label: 'En el DOM' },
          { value: 'false', label: 'Fuera del DOM' },
        ],
        defaultValue: 'true',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertChecked',
    label: 'Verify Checked',
    category: 'assertion',
    description: 'Verifies if a checkbox/radio is checked (toBeChecked)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input[type="checkbox"]',
        required: true,
      },
      {
        name: 'checked',
        label: 'Expected state',
        type: 'select',
        options: [
          { value: 'true', label: 'Marcado' },
          { value: 'false', label: 'No marcado' },
        ],
        defaultValue: 'true',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertEnabled',
    label: 'Verify Enabled',
    category: 'assertion',
    description: 'Verifies if an element is enabled (toBeEnabled)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button#submit',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertDisabled',
    label: 'Verify Disabled',
    category: 'assertion',
    description: 'Verifies if an element is disabled (toBeDisabled)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button#submit',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertEditable',
    label: 'Verify Editable',
    category: 'assertion',
    description: 'Verifies if a field is editable (toBeEditable)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#name',
        required: true,
      },
      {
        name: 'editable',
        label: 'Expected state',
        type: 'select',
        options: [
          { value: 'true', label: 'Editable' },
          { value: 'false', label: 'No editable' },
        ],
        defaultValue: 'true',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertEmpty',
    label: 'Verify Empty',
    category: 'assertion',
    description: 'Verifies if a container is empty (toBeEmpty)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.items-list',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertFocused',
    label: 'Verify Focused',
    category: 'assertion',
    description: 'Verifies if an element has focus (toBeFocused)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertInViewport',
    label: 'Verify In Viewport',
    category: 'assertion',
    description: 'Verifies if an element is visible in the viewport (toBeInViewport)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.visible-section',
        required: true,
      },
      {
        name: 'ratio',
        label: 'Minimum visible ratio (0-1)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertText',
    label: 'Verify Text',
    category: 'assertion',
    description: 'Verifies the text of an element (toHaveText/toContainText)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'h1.title',
        required: true,
      },
      {
        name: 'expectedText',
        label: 'Expected text',
        type: 'text',
        placeholder: 'Welcome',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Match type',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exact (toHaveText)' },
          { value: 'contains', label: 'Contains (toContainText)' },
          { value: 'regex', label: 'Regular expression' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'ignoreCase',
        label: 'Ignore case',
        type: 'boolean',
        defaultValue: false,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAttribute',
    label: 'Verify Attribute',
    category: 'assertion',
    description: 'Verifies the value of a DOM attribute (toHaveAttribute)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'a#link',
        required: true,
      },
      {
        name: 'attribute',
        label: 'Attribute name',
        type: 'text',
        placeholder: 'href, class, data-id',
        required: true,
      },
      {
        name: 'expectedValue',
        label: 'Expected value (empty = existence only)',
        type: 'text',
        placeholder: 'attribute value',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertClass',
    label: 'Verify CSS Class',
    category: 'assertion',
    description: 'Verifies the CSS classes of an element (toHaveClass/toContainClass)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'div#card',
        required: true,
      },
      {
        name: 'expectedClass',
        label: 'Expected class(es)',
        type: 'text',
        placeholder: 'active highlighted',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Verification type',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exact (toHaveClass)' },
          { value: 'contains', label: 'Contains (toContainClass)' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertCSS',
    label: 'Verify CSS Style',
    category: 'assertion',
    description: 'Verifies a CSS property of the element (toHaveCSS)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.button',
        required: true,
      },
      {
        name: 'cssProperty',
        label: 'CSS Property',
        type: 'text',
        placeholder: 'background-color, display, opacity',
        required: true,
      },
      {
        name: 'expectedValue',
        label: 'Expected value',
        type: 'text',
        placeholder: 'rgb(255, 0, 0), block, 1',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertId',
    label: 'Verify ID',
    category: 'assertion',
    description: 'Verifies the ID of an element (toHaveId)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.my-component',
        required: true,
      },
      {
        name: 'expectedId',
        label: 'Expected ID',
        type: 'text',
        placeholder: 'user-profile',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertRole',
    label: 'Verify ARIA Role',
    category: 'assertion',
    description: 'Verifies the ARIA role of an element (toHaveRole)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.my-button',
        required: true,
      },
      {
        name: 'expectedRole',
        label: 'Expected role',
        type: 'select',
        options: [
          { value: 'button', label: 'button' },
          { value: 'checkbox', label: 'checkbox' },
          { value: 'dialog', label: 'dialog' },
          { value: 'link', label: 'link' },
          { value: 'menu', label: 'menu' },
          { value: 'menuitem', label: 'menuitem' },
          { value: 'navigation', label: 'navigation' },
          { value: 'progressbar', label: 'progressbar' },
          { value: 'radio', label: 'radio' },
          { value: 'tab', label: 'tab' },
          { value: 'tablist', label: 'tablist' },
          { value: 'tabpanel', label: 'tabpanel' },
          { value: 'textbox', label: 'textbox' },
          { value: 'listbox', label: 'listbox' },
          { value: 'option', label: 'option' },
          { value: 'combobox', label: 'combobox' },
          { value: 'slider', label: 'slider' },
          { value: 'spinbutton', label: 'spinbutton' },
          { value: 'switch', label: 'switch' },
          { value: 'alert', label: 'alert' },
          { value: 'alertdialog', label: 'alertdialog' },
          { value: 'grid', label: 'grid' },
          { value: 'row', label: 'row' },
          { value: 'cell', label: 'cell' },
          { value: 'tree', label: 'tree' },
          { value: 'treeitem', label: 'treeitem' },
          { value: 'heading', label: 'heading' },
          { value: 'img', label: 'img' },
          { value: 'list', label: 'list' },
          { value: 'listitem', label: 'listitem' },
          { value: 'main', label: 'main' },
          { value: 'region', label: 'region' },
          { value: 'search', label: 'search' },
          { value: 'form', label: 'form' },
        ],
        defaultValue: 'button',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAccessibleName',
    label: 'Verify Accessible Name',
    category: 'assertion',
    description: 'Verifies the accessible name of an element (toHaveAccessibleName)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'button.submit',
        required: true,
      },
      {
        name: 'expectedName',
        label: 'Expected accessible name',
        type: 'text',
        placeholder: 'Submit form',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertAccessibleDescription',
    label: 'Verify Accessible Description',
    category: 'assertion',
    description: 'Verifies the accessible description of an element (toHaveAccessibleDescription)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'expectedDescription',
        label: 'Expected description',
        type: 'text',
        placeholder: 'Ingrese su email corporativo',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertUrl',
    label: 'Verify URL',
    category: 'assertion',
    description: 'Verifies the current page URL (toHaveURL)',
    fields: [
      {
        name: 'expectedUrl',
        label: 'Expected URL',
        type: 'text',
        placeholder: '/dashboard or https://...',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Match type',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exact' },
          { value: 'contains', label: 'Contains' },
          { value: 'regex', label: 'Regular expression' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertTitle',
    label: 'Verify Title',
    category: 'assertion',
    description: 'Verifies the page title (toHaveTitle)',
    fields: [
      {
        name: 'expectedTitle',
        label: 'Expected title',
        type: 'text',
        placeholder: 'My App - Dashboard',
        required: true,
      },
      {
        name: 'matchType',
        label: 'Match type',
        type: 'select',
        options: [
          { value: 'exact', label: 'Exact' },
          { value: 'contains', label: 'Contains' },
          { value: 'regex', label: 'Regular expression' },
        ],
        defaultValue: 'contains',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertValue',
    label: 'Verify Value',
    category: 'assertion',
    description: 'Verifies the value of an input (toHaveValue)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: 'input#email',
        required: true,
      },
      {
        name: 'expectedValue',
        label: 'Expected value',
        type: 'text',
        placeholder: 'user@email.com',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertValues',
    label: 'Verify Select Values',
    category: 'assertion',
    description: 'Verifies the selected values of a multi-select (toHaveValues)',
    fields: [
      {
        name: 'selector',
        label: 'Select selector',
        type: 'text',
        placeholder: 'select#colors',
        required: true,
      },
      {
        name: 'expectedValues',
        label: 'Expected values (comma separated)',
        type: 'text',
        placeholder: 'red,blue,green',
        required: true,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertCount',
    label: 'Verify Count',
    category: 'assertion',
    description: 'Verifies the count of elements (toHaveCount)',
    fields: [
      {
        name: 'selector',
        label: 'Selector',
        type: 'text',
        placeholder: '.list-item',
        required: true,
      },
      {
        name: 'expectedCount',
        label: 'Expected count',
        type: 'number',
        required: true,
      },
      {
        name: 'comparison',
        label: 'Comparison',
        type: 'select',
        options: [
          { value: 'equal', label: 'Igual a' },
          { value: 'greaterThan', label: 'Mayor que' },
          { value: 'lessThan', label: 'Menor que' },
          { value: 'greaterOrEqual', label: 'Mayor o igual' },
          { value: 'lessOrEqual', label: 'Menor o igual' },
        ],
        defaultValue: 'equal',
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  {
    id: 'assertScreenshot',
    label: 'Verify Screenshot',
    category: 'assertion',
    description: 'Visually compares the element with a reference image (toHaveScreenshot)',
    fields: [
      {
        name: 'selector',
        label: 'Selector (empty = full page)',
        type: 'text',
        placeholder: '.visual-component',
      },
      {
        name: 'screenshotName',
        label: 'Screenshot name',
        type: 'text',
        placeholder: 'login-form',
        required: true,
      },
      {
        name: 'maxDiffPixels',
        label: 'Maximum different pixels',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'maxDiffPixelRatio',
        label: 'Maximum difference ratio (0-1)',
        type: 'number',
        defaultValue: 0,
      },
      {
        name: 'timeout',
        label: 'Timeout (ms)',
        type: 'number',
        defaultValue: 5000,
      },
    ],
  },

  // Control Flow
  {
    id: 'if',
    label: 'Condition (If)',
    category: 'control',
    description: 'Executes branches based on a condition',
    fields: [
      {
        name: 'conditionType',
        label: 'Condition type',
        type: 'select',
        options: [
          { value: 'elementExists', label: 'Element exists' },
          { value: 'elementVisible', label: 'Element visible' },
          { value: 'textContains', label: 'Text contains' },
          { value: 'urlContains', label: 'URL contains' },
        ],
        defaultValue: 'elementExists',
      },
      {
        name: 'selector',
        label: 'Selector/Value',
        type: 'text',
        placeholder: '#element or text',
        required: true,
      },
    ],
  },

  {
    id: 'loop',
    label: 'Loop',
    category: 'control',
    description: 'Repeats a sequence of actions',
    fields: [
      {
        name: 'loopType',
        label: 'Loop type',
        type: 'select',
        options: [
          { value: 'count', label: 'Fixed count' },
          { value: 'elements', label: 'For each element' },
          { value: 'data', label: 'For each data item' },
        ],
        defaultValue: 'count',
      },
      {
        name: 'value',
        label: 'Value (count or selector)',
        type: 'text',
        placeholder: '5 or .item',
        required: true,
      },
    ],
  },

  {
    id: 'code',
    label: 'JavaScript Code',
    category: 'control',
    description: 'Executes custom JavaScript code',
    fields: [
      {
        name: 'code',
        label: 'Code',
        type: 'textarea',
        placeholder: '// Write your JavaScript code here\n// You can use: page, context, browser\n// Example:\nconst title = await page.title();\nconsole.log(title);',
        required: true,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'text',
        placeholder: 'What this code does...',
      },
      {
        name: 'awaitResult',
        label: 'Await result',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },

  // Hooks - Lifecycle
  {
    id: 'beforeAll',
    label: 'Before All',
    category: 'hook',
    description: 'Runs once before all tests in the group',
    fields: [
      {
        name: 'hookName',
        label: 'Hook name',
        type: 'text',
        placeholder: 'Initial setup',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'What this hook does...',
      },
    ],
  },

  {
    id: 'beforeEach',
    label: 'Before Each',
    category: 'hook',
    description: 'Runs before each test',
    fields: [
      {
        name: 'hookName',
        label: 'Hook name',
        type: 'text',
        placeholder: 'Per-test setup',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'What this hook does...',
      },
    ],
  },

  {
    id: 'afterEach',
    label: 'After Each',
    category: 'hook',
    description: 'Runs after each test',
    fields: [
      {
        name: 'hookName',
        label: 'Hook name',
        type: 'text',
        placeholder: 'Per-test cleanup',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'What this hook does...',
      },
    ],
  },

  {
    id: 'afterAll',
    label: 'After All',
    category: 'hook',
    description: 'Runs once after all tests in the group',
    fields: [
      {
        name: 'hookName',
        label: 'Hook name',
        type: 'text',
        placeholder: 'Final cleanup',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        placeholder: 'What this hook does...',
      },
    ],
  },
];

// Group nodes by category
export const nodesByCategory = nodeTypes.reduce((acc, node) => {
  if (!acc[node.category]) {
    acc[node.category] = [];
  }
  acc[node.category].push(node);
  return acc;
}, {} as Record<NodeCategory, NodeTypeDefinition[]>);

export const categoryLabels: Record<NodeCategory, string> = {
  trigger: 'Triggers',
  action: 'Actions',
  assertion: 'Assertions',
  control: 'Control Flow',
  hook: 'Hooks (Lifecycle)',
};
