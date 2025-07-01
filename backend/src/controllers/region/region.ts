const regionOffsets = [
  [0, 0],    
  [0, 1],    
  [0, -1],   
  [1, 0],    
  [-1, 0],   
  [1, 1],    
  [-1, 1],   
  [1, -1],   
  [-1, -1],  
];

export function actualRegion(x: number, y: number): number[][] {
  return regionOffsets.map(([dx, dy]) => [x + dx, y + dy]);
}