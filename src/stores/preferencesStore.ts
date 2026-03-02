import { create } from 'zustand';

export type ThemeId = 'light' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'lavender' | 'slate' | 'obsidian';
export type LayoutId = 'default' | 'sidebar-right' | 'horizontal' | 'compact' | 'wide-canvas';
export type PalettePosition = 'left' | 'right' | 'top' | 'bottom';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  preview: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgCanvas: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentLight: string;
    accentText: string;
    cardBg: string;
    cardBorder: string;
    cardActiveBg: string;
    cardActiveBorder: string;
    headerBg: string;
    headerBorder: string;
    inputBg: string;
    inputBorder: string;
    bpmnElementStroke: string;
    bpmnElementFill: string;
    bpmnText: string;
    bpmnConnection: string;
    bpmnMarker: string;
    bpmnEventStroke: string;
    bpmnGatewayStroke: string;
  };
}

export interface LayoutConfig {
  id: LayoutId;
  name: string;
  description: string;
  icon: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'light',
    name: 'Light',
    preview: '#ffffff',
    colors: {
      bgPrimary: '#ffffff', bgSecondary: '#f9fafb', bgCanvas: '#f3f4f6',
      border: '#e5e7eb', textPrimary: '#111827', textSecondary: '#4b5563',
      textMuted: '#9ca3af', accent: '#2563eb', accentLight: '#eff6ff',
      accentText: '#1d4ed8', cardBg: '#ffffff', cardBorder: '#f3f4f6',
      cardActiveBg: '#eff6ff', cardActiveBorder: '#bfdbfe',
      headerBg: '#ffffff', headerBorder: '#e5e7eb',
      inputBg: '#ffffff', inputBorder: '#d1d5db',
      bpmnElementStroke: '#374151', bpmnElementFill: '#ffffff',
      bpmnText: '#111827', bpmnConnection: '#6b7280',
      bpmnMarker: '#6b7280', bpmnEventStroke: '#374151', bpmnGatewayStroke: '#d97706',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    preview: '#0f172a',
    colors: {
      bgPrimary: '#0f172a', bgSecondary: '#1e293b', bgCanvas: '#0f172a',
      border: '#334155', textPrimary: '#f1f5f9', textSecondary: '#94a3b8',
      textMuted: '#64748b', accent: '#38bdf8', accentLight: '#0c4a6e',
      accentText: '#7dd3fc', cardBg: '#1e293b', cardBorder: '#334155',
      cardActiveBg: '#0c4a6e', cardActiveBorder: '#0ea5e9',
      headerBg: '#1e293b', headerBorder: '#334155',
      inputBg: '#1e293b', inputBorder: '#475569',
      bpmnElementStroke: '#94a3b8', bpmnElementFill: '#1e293b',
      bpmnText: '#e2e8f0', bpmnConnection: '#64748b',
      bpmnMarker: '#64748b', bpmnEventStroke: '#38bdf8', bpmnGatewayStroke: '#fbbf24',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    preview: '#14532d',
    colors: {
      bgPrimary: '#f0fdf4', bgSecondary: '#ecfdf5', bgCanvas: '#f0fdf4',
      border: '#bbf7d0', textPrimary: '#14532d', textSecondary: '#166534',
      textMuted: '#4ade80', accent: '#16a34a', accentLight: '#dcfce7',
      accentText: '#15803d', cardBg: '#ffffff', cardBorder: '#bbf7d0',
      cardActiveBg: '#dcfce7', cardActiveBorder: '#4ade80',
      headerBg: '#f0fdf4', headerBorder: '#bbf7d0',
      inputBg: '#ffffff', inputBorder: '#86efac',
      bpmnElementStroke: '#166534', bpmnElementFill: '#ffffff',
      bpmnText: '#14532d', bpmnConnection: '#22c55e',
      bpmnMarker: '#22c55e', bpmnEventStroke: '#16a34a', bpmnGatewayStroke: '#ca8a04',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    preview: '#7c2d12',
    colors: {
      bgPrimary: '#fff7ed', bgSecondary: '#ffedd5', bgCanvas: '#fff7ed',
      border: '#fed7aa', textPrimary: '#7c2d12', textSecondary: '#9a3412',
      textMuted: '#fb923c', accent: '#ea580c', accentLight: '#ffedd5',
      accentText: '#c2410c', cardBg: '#ffffff', cardBorder: '#fed7aa',
      cardActiveBg: '#ffedd5', cardActiveBorder: '#fb923c',
      headerBg: '#fff7ed', headerBorder: '#fed7aa',
      inputBg: '#ffffff', inputBorder: '#fdba74',
      bpmnElementStroke: '#9a3412', bpmnElementFill: '#ffffff',
      bpmnText: '#7c2d12', bpmnConnection: '#ea580c',
      bpmnMarker: '#ea580c', bpmnEventStroke: '#ea580c', bpmnGatewayStroke: '#d97706',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    preview: '#18181b',
    colors: {
      bgPrimary: '#18181b', bgSecondary: '#27272a', bgCanvas: '#09090b',
      border: '#3f3f46', textPrimary: '#fafafa', textSecondary: '#a1a1aa',
      textMuted: '#71717a', accent: '#a78bfa', accentLight: '#2e1065',
      accentText: '#c4b5fd', cardBg: '#27272a', cardBorder: '#3f3f46',
      cardActiveBg: '#2e1065', cardActiveBorder: '#7c3aed',
      headerBg: '#27272a', headerBorder: '#3f3f46',
      inputBg: '#27272a', inputBorder: '#52525b',
      bpmnElementStroke: '#a1a1aa', bpmnElementFill: '#27272a',
      bpmnText: '#e4e4e7', bpmnConnection: '#71717a',
      bpmnMarker: '#71717a', bpmnEventStroke: '#a78bfa', bpmnGatewayStroke: '#fbbf24',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    preview: '#581c87',
    colors: {
      bgPrimary: '#faf5ff', bgSecondary: '#f3e8ff', bgCanvas: '#faf5ff',
      border: '#e9d5ff', textPrimary: '#581c87', textSecondary: '#6b21a8',
      textMuted: '#a855f7', accent: '#9333ea', accentLight: '#f3e8ff',
      accentText: '#7e22ce', cardBg: '#ffffff', cardBorder: '#e9d5ff',
      cardActiveBg: '#f3e8ff', cardActiveBorder: '#c084fc',
      headerBg: '#faf5ff', headerBorder: '#e9d5ff',
      inputBg: '#ffffff', inputBorder: '#d8b4fe',
      bpmnElementStroke: '#6b21a8', bpmnElementFill: '#ffffff',
      bpmnText: '#581c87', bpmnConnection: '#a855f7',
      bpmnMarker: '#a855f7', bpmnEventStroke: '#9333ea', bpmnGatewayStroke: '#d97706',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    preview: '#475569',
    colors: {
      bgPrimary: '#f8fafc', bgSecondary: '#f1f5f9', bgCanvas: '#e2e8f0',
      border: '#cbd5e1', textPrimary: '#1e293b', textSecondary: '#475569',
      textMuted: '#94a3b8', accent: '#475569', accentLight: '#f1f5f9',
      accentText: '#334155', cardBg: '#ffffff', cardBorder: '#e2e8f0',
      cardActiveBg: '#f1f5f9', cardActiveBorder: '#94a3b8',
      headerBg: '#f8fafc', headerBorder: '#cbd5e1',
      inputBg: '#ffffff', inputBorder: '#cbd5e1',
      bpmnElementStroke: '#475569', bpmnElementFill: '#ffffff',
      bpmnText: '#1e293b', bpmnConnection: '#94a3b8',
      bpmnMarker: '#94a3b8', bpmnEventStroke: '#475569', bpmnGatewayStroke: '#d97706',
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    preview: '#0d0d0d',
    colors: {
      bgPrimary: '#121212', bgSecondary: '#1a1a1a', bgCanvas: '#0d0d0d',
      border: '#2a2a2a', textPrimary: '#e8e4df', textSecondary: '#a39e93',
      textMuted: '#6b6560', accent: '#e2a857', accentLight: '#2a2010',
      accentText: '#f0c274', cardBg: '#1a1a1a', cardBorder: '#2a2a2a',
      cardActiveBg: '#2a2010', cardActiveBorder: '#e2a857',
      headerBg: '#161616', headerBorder: '#2a2a2a',
      inputBg: '#1a1a1a', inputBorder: '#3a3a3a',
      bpmnElementStroke: '#a39e93', bpmnElementFill: '#1e1e1e',
      bpmnText: '#e8e4df', bpmnConnection: '#6b6560',
      bpmnMarker: '#6b6560', bpmnEventStroke: '#e2a857', bpmnGatewayStroke: '#c084fc',
    },
  },
];

export const LAYOUTS: LayoutConfig[] = [
  { id: 'default', name: 'Default', description: 'Sidebar left, canvas right', icon: '◧' },
  { id: 'sidebar-right', name: 'Sidebar Right', description: 'Canvas left, sidebar right', icon: '◨' },
  { id: 'compact', name: 'Compact', description: 'Narrow sidebar (260px)', icon: '▫' },
];

interface PreferencesState {
  theme: ThemeId;
  layout: LayoutId;
  showFlowLabels: boolean;
  palettePosition: PalettePosition;
  setTheme: (theme: ThemeId) => void;
  setLayout: (layout: LayoutId) => void;
  setShowFlowLabels: (show: boolean) => void;
  setPalettePosition: (pos: PalettePosition) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

export const PALETTE_POSITIONS: { id: PalettePosition; label: string; icon: string }[] = [
  { id: 'left', label: 'Left', icon: '◧' },
  { id: 'right', label: 'Right', icon: '◨' },
  { id: 'top', label: 'Top', icon: '⬒' },
  { id: 'bottom', label: 'Bottom', icon: '⬓' },
];

export const usePreferencesStore = create<PreferencesState>((set) => ({
  theme: loadFromStorage<ThemeId>('bpmn_theme', 'light'),
  layout: loadFromStorage<LayoutId>('bpmn_layout', 'default'),
  showFlowLabels: loadFromStorage<boolean>('bpmn_flow_labels', true),
  palettePosition: loadFromStorage<PalettePosition>('bpmn_palette_pos', 'left'),
  setTheme: (theme) => {
    localStorage.setItem('bpmn_theme', JSON.stringify(theme));
    set({ theme });
  },
  setLayout: (layout) => {
    localStorage.setItem('bpmn_layout', JSON.stringify(layout));
    set({ layout });
  },
  setShowFlowLabels: (show) => {
    localStorage.setItem('bpmn_flow_labels', JSON.stringify(show));
    set({ showFlowLabels: show });
  },
  setPalettePosition: (pos) => {
    localStorage.setItem('bpmn_palette_pos', JSON.stringify(pos));
    set({ palettePosition: pos });
  },
}));
