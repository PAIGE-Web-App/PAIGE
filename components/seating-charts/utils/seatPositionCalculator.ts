export interface SeatPosition {
  x: number;
  y: number;
}

export interface TableShape {
  width: number;
  height: number;
  seatPositions: (capacity: number, customWidth?: number, customHeight?: number) => SeatPosition[];
}

export const TABLE_SHAPES: Record<string, TableShape> = {
  round: {
    width: 120,
    height: 120,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const width = customWidth || 120;
      const height = customHeight || 120;
      const radius = Math.min(width, height) * 0.67; // Seats outside table, proportional to size
      const positions: SeatPosition[] = [];
      for (let i = 0; i < capacity; i++) {
        const angle = (i * 2 * Math.PI) / capacity;
        positions.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle)
        });
      }
      return positions;
    }
  },
  long: {
    width: 200,
    height: 80,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const width = customWidth || 200;
      const height = customHeight || 80;
      const positions: SeatPosition[] = [];
      const spacing = (width - 40) / Math.max(1, capacity - 1);
      for (let i = 0; i < capacity; i++) {
        positions.push({
          x: -(width / 2) + 20 + (i * spacing),
          y: -(height / 2) - 20 // Seats above table
        });
      }
      return positions;
    }
  },

  square: {
    width: 120,
    height: 120,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const width = customWidth || 120;
      const height = customHeight || 120;
      const positions: SeatPosition[] = [];
      
      // Simple approach: place seats around the perimeter
      for (let i = 0; i < capacity; i++) {
        if (i === 0) {
          // Top
          positions.push({ x: 0, y: -(height / 2) - 20 });
        } else if (i === 1) {
          // Right
          positions.push({ x: (width / 2) + 20, y: 0 });
        } else if (i === 2) {
          // Bottom
          positions.push({ x: 0, y: (height / 2) + 20 });
        } else if (i === 3) {
          // Left
          positions.push({ x: -(width / 2) - 20, y: 0 });
        } else if (i === 4) {
          // Top-right
          positions.push({ x: (width / 2) * 0.33, y: -(height / 2) - 20 });
        } else if (i === 5) {
          // Bottom-right
          positions.push({ x: (width / 2) + 20, y: (height / 2) * 0.33 });
        } else if (i === 6) {
          // Bottom-left
          positions.push({ x: -(width / 2) * 0.33, y: (height / 2) + 20 });
        } else if (i === 7) {
          // Top-left
          positions.push({ x: -(width / 2) - 20, y: -(height / 2) * 0.33 });
        } else {
          // For higher capacities, add more seats in between
          const side = i % 4;
          const position = Math.floor(i / 4);
          const offset = (position + 1) * (Math.min(width, height) * 0.17);
          
          switch (side) {
            case 0: // Top
              positions.push({ x: -(width / 2) * 0.33 + offset, y: -(height / 2) - 20 });
              break;
            case 1: // Right
              positions.push({ x: (width / 2) + 20, y: -(height / 2) * 0.33 + offset });
              break;
            case 2: // Bottom
              positions.push({ x: (width / 2) * 0.33 - offset, y: (height / 2) + 20 });
              break;
            case 3: // Left
              positions.push({ x: -(width / 2) - 20, y: (height / 2) * 0.33 - offset });
              break;
          }
        }
      }
      
      return positions;
    }
  }
};

export const getTableShape = (type: string): TableShape => {
  return TABLE_SHAPES[type] || TABLE_SHAPES.round;
};
