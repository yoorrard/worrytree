
export interface Worry {
  id: number;
  text: string;
  position: { top: string; left: string; transform: string };
  isFalling: boolean;
  color: string;
}
