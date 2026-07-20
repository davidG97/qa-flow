// Tipos de localizadores soportados por Playwright
export type LocatorType = 
  | 'css'
  | 'xpath'
  | 'text'
  | 'role'
  | 'testId'
  | 'id'
  | 'placeholder'
  | 'altText'
  | 'title'
  | 'label';

// Definición de un localizador individual
export interface Locator {
  id: string;
  name: string;           // Nombre descriptivo (ej: "loginButton", "usernameInput")
  type: LocatorType;      // Tipo de localizador
  value: string;          // El selector en sí
  description?: string;   // Optional description
  // Para roles, opciones adicionales
  roleOptions?: {
    name?: string;        // Nombre accesible del elemento
    exact?: boolean;      // Coincidencia exacta
    pressed?: boolean;    // Para botones toggle
    checked?: boolean;    // Para checkboxes
    expanded?: boolean;   // Para elementos expandibles
  };
}

// Page Object - representa una página con sus localizadores
export interface PageObject {
  id: string;
  name: string;           // Nombre de la página (ej: "LoginPage", "HomePage")
  description?: string;
  url?: string;           // URL base de la página (opcional)
  locators: Locator[];
  createdAt: string;
  updatedAt: string;
}

// Colección de Page Objects para un proyecto
export interface LocatorStore {
  id: string;
  projectId?: string;     // Si está asociado a un proyecto específico
  pages: PageObject[];
  createdAt: string;
  updatedAt: string;
}

// Opciones de tipos de localizadores con información adicional
export const LOCATOR_TYPES: Array<{
  value: LocatorType;
  label: string;
  description: string;
  example: string;
  playwrightMethod: string;
}> = [
  {
    value: 'css',
    label: 'CSS Selector',
    description: 'Selector CSS estándar',
    example: '#login-btn, .submit-button, [data-action="submit"]',
    playwrightMethod: 'page.locator()',
  },
  {
    value: 'xpath',
    label: 'XPath',
    description: 'Expresión XPath para localizar elementos',
    example: '//button[@id="submit"], //div[contains(@class, "modal")]',
    playwrightMethod: 'page.locator()',
  },
  {
    value: 'text',
    label: 'Texto',
    description: 'Localiza por contenido de texto',
    example: 'Login, Submit form',
    playwrightMethod: 'page.getByText()',
  },
  {
    value: 'role',
    label: 'Role (ARIA)',
    description: 'Localiza por rol accesible del elemento',
    example: 'button, textbox, link, heading',
    playwrightMethod: 'page.getByRole()',
  },
  {
    value: 'testId',
    label: 'Test ID',
    description: 'Localiza por atributo data-testid',
    example: 'login-form, submit-button, error-message',
    playwrightMethod: 'page.getByTestId()',
  },
  {
    value: 'id',
    label: 'ID',
    description: 'Localiza por atributo id del elemento',
    example: 'username, password, submit',
    playwrightMethod: 'page.locator("#id")',
  },
  {
    value: 'placeholder',
    label: 'Placeholder',
    description: 'Localiza inputs por su placeholder',
    example: 'Ingrese su email, Contraseña',
    playwrightMethod: 'page.getByPlaceholder()',
  },
  {
    value: 'altText',
    label: 'Alt Text',
    description: 'Localiza imágenes por su texto alternativo',
    example: 'Logo de la empresa, Icono de usuario',
    playwrightMethod: 'page.getByAltText()',
  },
  {
    value: 'title',
    label: 'Title',
    description: 'Localiza por atributo title',
    example: 'Close modal, More info',
    playwrightMethod: 'page.getByTitle()',
  },
  {
    value: 'label',
    label: 'Label',
    description: 'Localiza inputs por el texto de su label asociado',
    example: 'Email, Contraseña, Recordarme',
    playwrightMethod: 'page.getByLabel()',
  },
];

// Roles ARIA comunes
export const ARIA_ROLES = [
  'alert',
  'alertdialog',
  'application',
  'article',
  'banner',
  'button',
  'cell',
  'checkbox',
  'columnheader',
  'combobox',
  'complementary',
  'contentinfo',
  'dialog',
  'document',
  'feed',
  'figure',
  'form',
  'grid',
  'gridcell',
  'group',
  'heading',
  'img',
  'link',
  'list',
  'listbox',
  'listitem',
  'log',
  'main',
  'marquee',
  'math',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'navigation',
  'none',
  'note',
  'option',
  'presentation',
  'progressbar',
  'radio',
  'radiogroup',
  'region',
  'row',
  'rowgroup',
  'rowheader',
  'scrollbar',
  'search',
  'searchbox',
  'separator',
  'slider',
  'spinbutton',
  'status',
  'switch',
  'tab',
  'table',
  'tablist',
  'tabpanel',
  'term',
  'textbox',
  'timer',
  'toolbar',
  'tooltip',
  'tree',
  'treegrid',
  'treeitem',
];

// Helper para generar código Playwright
export function generatePlaywrightCode(locator: Locator): string {
  switch (locator.type) {
    case 'css':
      return `page.locator('${locator.value}')`;
    case 'xpath':
      return `page.locator('xpath=${locator.value}')`;
    case 'text':
      return `page.getByText('${locator.value}')`;
    case 'role':
      if (locator.roleOptions?.name) {
        const options: string[] = [];
        if (locator.roleOptions.name) options.push(`name: '${locator.roleOptions.name}'`);
        if (locator.roleOptions.exact !== undefined) options.push(`exact: ${locator.roleOptions.exact}`);
        if (locator.roleOptions.pressed !== undefined) options.push(`pressed: ${locator.roleOptions.pressed}`);
        if (locator.roleOptions.checked !== undefined) options.push(`checked: ${locator.roleOptions.checked}`);
        if (locator.roleOptions.expanded !== undefined) options.push(`expanded: ${locator.roleOptions.expanded}`);
        return `page.getByRole('${locator.value}', { ${options.join(', ')} })`;
      }
      return `page.getByRole('${locator.value}')`;
    case 'testId':
      return `page.getByTestId('${locator.value}')`;
    case 'id':
      return `page.locator('#${locator.value}')`;
    case 'placeholder':
      return `page.getByPlaceholder('${locator.value}')`;
    case 'altText':
      return `page.getByAltText('${locator.value}')`;
    case 'title':
      return `page.getByTitle('${locator.value}')`;
    case 'label':
      return `page.getByLabel('${locator.value}')`;
    default:
      return `page.locator('${locator.value}')`;
  }
}

// Helper para convertir nombre a identificador válido de JavaScript (camelCase)
function toValidIdentifier(name: string): string {
  // Remover caracteres no alfanuméricos excepto espacios y guiones
  const cleaned = name.replaceAll(/[^a-zA-Z0-9\s_-]/g, '');
  
  // Dividir por espacios, guiones y guiones bajos
  const words = cleaned.split(/[\s_-]+/).filter(w => w.length > 0);
  
  if (words.length === 0) return 'element';
  
  // Primera palabra en minúsculas, resto en PascalCase
  return words.map((word, index) => {
    const lower = word.toLowerCase();
    if (index === 0) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join('');
}

// Helper para generar clase Page Object Model
export function generatePageObjectClass(page: PageObject): string {
  const className = page.name.replaceAll(/\s+/g, '').replace(/Page$/i, '') + 'Page';
  
  let code = `import { Page, Locator } from '@playwright/test';\n\n`;
  code += `/**\n * ${page.description || page.name}\n`;
  if (page.url) code += ` * URL: ${page.url}\n`;
  code += ` */\n`;
  code += `export class ${className} {\n`;
  code += `  readonly page: Page;\n\n`;
  
  // Declarar localizadores como propiedades
  for (const loc of page.locators) {
    const propName = toValidIdentifier(loc.name);
    if (loc.description) {
      code += `  /** ${loc.description} */\n`;
    }
    code += `  readonly ${propName}: Locator;\n`;
  }
  
  code += `\n  constructor(page: Page) {\n`;
  code += `    this.page = page;\n`;
  
  // Inicializar localizadores
  for (const loc of page.locators) {
    const propName = toValidIdentifier(loc.name);
    code += `    this.${propName} = ${generatePlaywrightCode(loc).replace('page', 'this.page')};\n`;
  }
  
  code += `  }\n`;
  
  // Método para navegar a la página
  if (page.url) {
    code += `\n  async goto() {\n`;
    code += `    await this.page.goto('${page.url}');\n`;
    code += `  }\n`;
  }
  
  code += `}\n`;
  
  return code;
}
