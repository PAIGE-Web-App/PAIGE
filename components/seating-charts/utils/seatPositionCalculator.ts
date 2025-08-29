export interface SeatPosition {
  x: number;
  y: number;
}

export interface TableShape {
  width: number;
  height: number;
  seatPositions: (capacity: number) => SeatPosition[];
}

export const TABLE_SHAPES: Record<string, TableShape> = {
  round: {
    width: 120,
    height: 120,
    seatPositions: (capacity: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const radius = 80; // Seats outside table
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
    seatPositions: (capacity: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const positions: SeatPosition[] = [];
      const spacing = 160 / Math.max(1, capacity - 1);
      for (let i = 0; i < capacity; i++) {
        positions.push({
          x: -80 + (i * spacing),
          y: -60 // Seats above table
        });
      }
      return positions;
    }
  },
  oval: {
    width: 160,
    height: 100,
    seatPositions: (capacity: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const positions: SeatPosition[] = [];
      const radiusX = 100; // Wider than tall for oval
      const radiusY = 70;
      for (let i = 0; i < capacity; i++) {
        const angle = (i * 2 * Math.PI) / capacity;
        positions.push({
          x: radiusX * Math.cos(angle),
          y: radiusY * Math.sin(angle)
        });
      }
      return positions;
    }
  },
  square: {
    width: 120,
    height: 120,
    seatPositions: (capacity: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const positions: SeatPosition[] = [];
      
      // Simple approach: place seats around the perimeter
      for (let i = 0; i < capacity; i++) {
        if (i === 0) {
          // Top
          positions.push({ x: 0, y: -70 });
        } else if (i === 1) {
          // Right
          positions.push({ x: 70, y: 0 });
        } else if (i === 2) {
          // Bottom
          positions.push({ x: 0, y: 70 });
        } else if (i === 3) {
          // Left
          positions.push({ x: -70, y: 0 });
        } else if (i === 4) {
          // Top-right
          positions.push({ x: 40, y: -70 });
        } else if (i === 5) {
          // Bottom-right
          positions.push({ x: 70, y: 40 });
        } else if (i === 6) {
          // Bottom-left
          positions.push({ x: -40, y: 70 });
        } else if (i === 7) {
          // Top-left
          positions.push({ x: -70, y: -40 });
        } else {
          // For higher capacities, add more seats in between
          const side = i % 4;
          const position = Math.floor(i / 4);
          const offset = (position + 1) * 20;
          
          switch (side) {
            case 0: // Top
              positions.push({ x: -40 + offset, y: -70 });
              break;
            case 1: // Right
              positions.push({ x: 70, y: -40 + offset });
              break;
            case 2: // Bottom
              positions.push({ x: 40 - offset, y: 70 });
              break;
            case 3: // Left
              positions.push({ x: -70, y: 40 - offset });
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
