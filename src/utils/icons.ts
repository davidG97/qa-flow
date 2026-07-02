import { IconType } from 'react-icons';
import {
  FiPlay,
  FiNavigation,
  FiMousePointer,
  FiEdit3,
  FiCheckSquare,
  FiType,
  FiList,
  FiUpload,
  FiTrash2,
  FiCommand,
  FiEye,
  FiEyeOff,
  FiArrowDownCircle,
  FiZap,
  FiDisc,
  FiClock,
  FiPause,
  FiTag,
  FiFileText,
  FiCamera,
  FiLink2,
  FiHash,
  FiToggleRight,
  FiToggleLeft,
  FiBox,
  FiSquare,
  FiImage,
  FiBookmark,
  FiInfo,
  FiLayout,
  FiCode,
  FiTarget,
  FiGitBranch,
  FiRepeat,
  FiMove,
  FiAlignLeft,
  FiCopy,
  FiGlobe,
  FiUser,
  FiSkipBack,
  FiSkipForward,
  FiRewind,
  FiFastForward,
} from 'react-icons/fi';

// Mapa de iconos por nodeType
export const nodeIcons: Record<string, IconType> = {
  // Triggers
  start: FiPlay,
  navigate: FiNavigation,
  
  // Actions - Click
  click: FiMousePointer,
  dblclick: FiMousePointer,
  tap: FiMousePointer,
  
  // Actions - Form
  check: FiCheckSquare,
  fill: FiEdit3,
  type: FiType,
  clear: FiTrash2,
  select: FiList,
  setInputFiles: FiUpload,
  
  // Actions - Keyboard
  press: FiCommand,
  pressSequentially: FiType,
  
  // Actions - Focus
  hover: FiTarget,
  focus: FiDisc,
  blur: FiEyeOff,
  selectText: FiAlignLeft,
  
  // Actions - Movement
  scrollIntoView: FiArrowDownCircle,
  dragTo: FiMove,
  
  // Actions - Wait
  wait: FiClock,
  waitFor: FiPause,
  
  // Actions - Events
  dispatchEvent: FiZap,
  
  // Actions - Getters
  getAttribute: FiTag,
  inputValue: FiCopy,
  textContent: FiFileText,
  
  // Screenshot
  screenshot: FiCamera,
  
  // Assertions - Visibility
  assertVisible: FiEye,
  assertHidden: FiEyeOff,
  assertAttached: FiLink2,
  assertInViewport: FiLayout,
  
  // Assertions - State
  assertChecked: FiCheckSquare,
  assertEnabled: FiToggleRight,
  assertDisabled: FiToggleLeft,
  assertEditable: FiEdit3,
  assertEmpty: FiBox,
  assertFocused: FiDisc,
  
  // Assertions - Text
  assertText: FiAlignLeft,
  
  // Assertions - Attributes
  assertAttribute: FiTag,
  assertClass: FiCode,
  assertCSS: FiLayout,
  assertId: FiHash,
  assertRole: FiUser,
  assertAccessibleName: FiInfo,
  assertAccessibleDescription: FiBookmark,
  
  // Assertions - Values
  assertValue: FiFileText,
  assertValues: FiList,
  assertCount: FiHash,
  
  // Assertions - Page
  assertUrl: FiGlobe,
  assertTitle: FiBookmark,
  
  // Assertions - Visual
  assertScreenshot: FiImage,
  
  // Control Flow
  if: FiGitBranch,
  loop: FiRepeat,
  code: FiCode,
  
  // Hooks (Lifecycle)
  beforeAll: FiSkipBack,
  beforeEach: FiRewind,
  afterEach: FiFastForward,
  afterAll: FiSkipForward,
};

// Obtiene el icono para un tipo de nodo, con fallback
export const getNodeIcon = (nodeType: string): IconType => {
  return nodeIcons[nodeType] || FiSquare;
};
