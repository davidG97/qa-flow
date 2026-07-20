/**
 * Translator of technical Playwright errors to user-friendly QA messages
 */

export interface FriendlyError {
  title: string;
  description: string;
  suggestions: string[];
  category: 'selector' | 'timeout' | 'navigation' | 'assertion' | 'network' | 'browser' | 'unknown';
  originalError?: string;
}

// Known error patterns
const errorPatterns: Array<{
  pattern: RegExp;
  handler: (match: RegExpMatchArray, original: string) => FriendlyError;
}> = [
  // Timeout waiting for element
  {
    pattern: /Timeout (\d+)ms exceeded.*waiting for (locator|selector)\s*["']?([^"'\n]+)["']?/i,
    handler: (match, original) => ({
      title: 'Element not found',
      description: `El elemento "${truncate(match[3], 50)}" did not appear on the page after ${Number.parseInt(match[1], 10) / 1000} seconds.`,
      suggestions: [
        'Verify that the selector is correct',
        'Check if the element appears after some action (like scroll or click)',
        'Increase wait time if the page loads slowly',
        'Use browser developer tools (F12) to verify the selector',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de click - elemento no visible o interactable
  {
    pattern: /locator\.click:.*element is not visible|element is outside of the viewport/i,
    handler: (_, original) => ({
      title: 'Element is not visible',
      description: 'The element exists but cannot be clicked because it is not visible on screen.',
      suggestions: [
        'Add a scroll before the click',
        'Verify the element is not hidden (display: none or visibility: hidden)',
        'Wait for any animation to finish',
        'Enable the "Force" option in the node if necessary',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de click - elemento interceptado
  {
    pattern: /locator\.click:.*element is (covered|intercepted|obscured) by|pointer-events/i,
    handler: (_, original) => ({
      title: 'Another element blocks the click',
      description: 'There is an element (like a modal, overlay, or popup) covering the element you want to click.',
      suggestions: [
        'Close any open modal or popup',
        'Wait for any loader or overlay to disappear',
        'Check if there is a cookie banner blocking',
        'Use the "Force" option to bypass this check',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de navegación
  {
    pattern: /net::ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|ERR_INTERNET_DISCONNECTED/i,
    handler: (_, original) => ({
      title: 'Cannot access the page',
      description: 'Could not connect to the server. The URL may be misspelled or the server is unavailable.',
      suggestions: [
        'Verify the URL is correctly spelled',
        'Check your internet connection',
        'Verify the server is running',
        'If it is an internal URL, verify you are on the correct VPN',
      ],
      category: 'navigation',
      originalError: original,
    }),
  },

  // Timeout de navegación
  {
    pattern: /Timeout (\d+)ms exceeded.*page\.goto|Navigation timeout|Waiting for page to load/i,
    handler: (match, original) => ({
      title: 'Page took too long to load',
      description: `The page did not finish loading in ${Number.parseInt(match[1] || '30000', 10) / 1000} seconds.`,
      suggestions: [
        'Verify the URL is correct',
        'Increase the navigation timeout',
        'The page may be overloaded or very slow',
        'Check your internet connection',
      ],
      category: 'timeout',
      originalError: original,
    }),
  },

  // Error de assertion - texto no encontrado
  {
    pattern: /expect.*toHaveText|toContainText.*Received:?\s*["']([^"']*)["']/i,
    handler: (match, original) => ({
      title: 'Expected text does not match',
      description: `The element has different text than expected. Found: "${truncate(match[1], 100)}"`,
      suggestions: [
        'Verify the expected text is exactly the same (case, spaces)',
        'Content may be dynamic or change based on user',
        'Use "Contains text" instead of exact comparison',
        'Check if text changes based on language or settings',
      ],
      category: 'assertion',
      originalError: original,
    }),
  },

  // Error de assertion - elemento no visible
  {
    pattern: /expect.*toBeVisible.*Received:?\s*false|Expected:?\s*visible/i,
    handler: (_, original) => ({
      title: 'Element is not visible',
      description: 'The element exists in the HTML but is not displayed on screen.',
      suggestions: [
        'May be hidden with CSS (display: none)',
        'May appear after some action',
        'Check if you need to scroll to see it',
        'Check conditions that show/hide the element',
      ],
      category: 'assertion',
      originalError: original,
    }),
  },

  // Strict mode - múltiples elementos
  {
    pattern: /strict mode violation.*resolved to (\d+) elements/i,
    handler: (match, original) => ({
      title: 'Selector matches multiple elements',
      description: `Found ${match[1]} elements matching the selector. Playwright does not know which one to use.`,
      suggestions: [
        'Make the selector more specific (e.g., add a class or ID)',
        'Use nth() to select a specific one: selector >> nth=0',
        'Add more context: ".container .button" instead of ".button"',
        'Use unique text: "text=My Unique Button"',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de fill en elemento no editable
  {
    pattern: /locator\.fill:.*Element is not an <input>|not editable|cannot fill/i,
    handler: (_, original) => ({
      title: 'Cannot type in this element',
      description: 'The selected element is not a text field where you can type.',
      suggestions: [
        'Verify the selector points to an input or textarea',
        'The field may be disabled',
        'It may be a read-only element',
        'Use "Type Text" instead of "Fill" if you need to simulate keystrokes',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de select
  {
    pattern: /locator\.selectOption:.*not a <select> element|option.*not found/i,
    handler: (_, original) => ({
      title: 'Error selecting option',
      description: 'Could not select the option. The element is not a valid dropdown or the option does not exist.',
      suggestions: [
        'Verify the selector points to a <select> element',
        'Verify the option value is correct',
        'If it is a custom dropdown (not native), use Click instead of Select',
        'Check available options in developer tools',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Browser cerrado
  {
    pattern: /Target (page|browser|context).*closed|Browser has been closed/i,
    handler: (_, original) => ({
      title: 'Browser closed unexpectedly',
      description: 'The browser window closed before completing the actions.',
      suggestions: [
        'Verify there is no previous error closing the browser',
        'Check if there is a popup or alert causing the closure',
        'Increase wait times',
        'Review previous logs to see what caused the closure',
      ],
      category: 'browser',
      originalError: original,
    }),
  },

  // Frame/iframe no encontrado
  {
    pattern: /frame|iframe.*not found|cannot access|cross-origin/i,
    handler: (_, original) => ({
      title: 'Problem with iframe or frame',
      description: 'The element is inside an iframe and cannot be accessed directly.',
      suggestions: [
        'Use the "Switch Frame" node before interacting with elements inside the iframe',
        'Verify the iframe has loaded completely',
        'If the iframe is from another domain, there may be security restrictions',
      ],
      category: 'selector',
      originalError: original,
    }),
  },

  // Error de red genérico
  {
    pattern: /network|fetch|request failed|CORS|Failed to fetch/i,
    handler: (_, original) => ({
      title: 'Network connection error',
      description: 'There was a problem communicating with the server.',
      suggestions: [
        'Check your internet connection',
        'The server may be down or overloaded',
        'There may be a CORS issue if accessing from a different origin',
        'Try running again in a few minutes',
      ],
      category: 'network',
      originalError: original,
    }),
  },
];

// Helper function to truncate long text
const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
};

/**
 * Translates a technical error to a user-friendly message
 */
export const translateError = (error: string | Error): FriendlyError => {
  const errorMessage = typeof error === 'string' ? error : error.message;

  // Try to find a known pattern
  for (const { pattern, handler } of errorPatterns) {
    const match = pattern.exec(errorMessage);
    if (match) {
      return handler(match, errorMessage);
    }
  }

  // Generic error if no pattern matches
  return {
    title: 'Error during execution',
    description: extractReadableMessage(errorMessage),
    suggestions: [
      'Review the node configuration',
      'Verify that the selectors are correct',
      'Check the original error message for more details',
    ],
    category: 'unknown',
    originalError: errorMessage,
  };
};

/**
 * Extracts a readable part of the error message
 */
const extractReadableMessage = (error: string): string => {
  // Remove stack traces and file paths
  let cleaned = error
    .replace(/at\s+[\w.]+\s+\([^)]+\)/g, '') // Remove stack trace lines
    .replace(/\s+at\s+[^\n]+/g, '') // Remove more stack traces
    .replace(/Error:\s*/g, '') // Remove "Error:" prefix
    .replace(/\n{2,}/g, '\n') // Remove multiple newlines
    .trim();

  // Tomar solo la primera línea significativa
  const firstLine = cleaned.split('\n')[0];
  
  return truncate(firstLine || 'Error desconocido', 200);
};
