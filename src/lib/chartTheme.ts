import type { Theme } from '../context/ThemeContext';

export interface ChartPalette {
  axis: string;
  grid: string;
  bar: string;
  surface: string;
  doughnut: [string, string, string];
}

const LIGHT: ChartPalette = {
  axis: '#8f8d83',
  grid: '#e6e4dc',
  bar: '#2a78d6',
  surface: '#ffffff',
  doughnut: ['#2a78d6', '#eb6834', '#1baf7a'],
};

const DARK: ChartPalette = {
  axis: '#a5a399',
  grid: '#2b2a26',
  bar: '#5b9fe3',
  surface: '#191917',
  doughnut: ['#5b9fe3', '#f2915f', '#3fcf9e'],
};

export function chartPalette(theme: Theme): ChartPalette {
  return theme === 'dark' ? DARK : LIGHT;
}
