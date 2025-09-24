
export interface Worry {
  id: number;
  text: string;
  position: { top: string; left: string; transform: string };
  isFalling: boolean;
  color: string;
}

export const monsterColors = [
    '#ff7b7b', '#ffb07b', '#ffd97b', '#a6ff7b',
    '#7bffb0', '#7bffff', '#7ba6ff', '#b07bff', '#ff7bff'
];
