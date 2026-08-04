import type { Theme } from '../context/ThemeContext';

export interface ChartPalette {
  axis: string;
  grid: string;
  bar: string;
  surface: string;
  doughnut: [string, string, string];
  status: { verde: string; amarelo: string; vermelho: string };
}

const LIGHT: ChartPalette = {
  axis: '#8f8d83',
  grid: '#e6e4dc',
  bar: '#2a78d6',
  surface: '#ffffff',
  doughnut: ['#2a78d6', '#eb6834', '#1baf7a'],
  status: { verde: '#0ca30c', amarelo: '#d98c00', vermelho: '#d03b3b' },
};

const DARK: ChartPalette = {
  axis: '#a5a399',
  grid: '#2b2a26',
  bar: '#5b9fe3',
  surface: '#191917',
  doughnut: ['#5b9fe3', '#f2915f', '#3fcf9e'],
  status: { verde: '#3fcf5c', amarelo: '#f0b429', vermelho: '#f0605f' },
};

export function chartPalette(theme: Theme): ChartPalette {
  return theme === 'dark' ? DARK : LIGHT;
}
