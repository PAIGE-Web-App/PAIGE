export interface SeatPosition {
  x: number;
  y: number;
}

export interface TableShape {
  width: number;
  height: number;
  seatPositions: (capacity: number, customWidth?: number, customHeight?: number, rotation?: number) => SeatPosition[];
}

// Helper function to rotate a point around the origin
const rotatePoint = (x: number, y: number, rotationDegrees: number): { x: number; y: number } => {
  const rotationRadians = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);
  
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
};

export const TABLE_SHAPES: Record<string, TableShape> = {
  round: {
    width: 120,
    height: 120,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number, rotation?: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const width = customWidth || 120;
      const height = customHeight || 120;
      const radius = Math.min(width, height) * 0.67; // Seats outside table, proportional to size
      const positions: SeatPosition[] = [];
      
      for (let i = 0; i < capacity; i++) {
        const angle = (i * 2 * Math.PI) / capacity;
        const baseX = radius * Math.cos(angle);
        const baseY = radius * Math.sin(angle);
        
        if (rotation && rotation !== 0) {
          const rotated = rotatePoint(baseX, baseY, rotation);
          positions.push(rotated);
        } else {
          positions.push({ x: baseX, y: baseY });
        }
      }
      
      return positions;
    }
  },
  long: {
    width: 200,
    height: 80,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number, rotation?: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const width = customWidth || 200;
      const height = customHeight || 80;
      const positions: SeatPosition[] = [];
      
      // Distribute seats evenly on the long sides only (top and bottom)
      const seatsPerSide = Math.ceil(capacity / 2);
      const seatSpacing = width / (seatsPerSide + 1);
      
      // Top side seats
      for (let i = 0; i < Math.min(seatsPerSide, capacity); i++) {
        const baseX = -(width / 2) + seatSpacing * (i + 1);
        const baseY = -(height / 2) - 20;
        
        if (rotation && rotation !== 0) {
          const rotated = rotatePoint(baseX, baseY, rotation);
          positions.push(rotated);
        } else {
          positions.push({ x: baseX, y: baseY });
        }
      }
      
      // Bottom side seats (if there are remaining seats)
      const remainingSeats = capacity - Math.min(seatsPerSide, capacity);
      for (let i = 0; i < remainingSeats; i++) {
        const baseX = -(width / 2) + seatSpacing * (i + 1);
        const baseY = (height / 2) + 20;
        
        if (rotation && rotation !== 0) {
          const rotated = rotatePoint(baseX, baseY, rotation);
          positions.push(rotated);
        } else {
          positions.push({ x: baseX, y: baseY });
        }
      }
      
      return positions;
    }
  },

  square: {
    width: 120,
    height: 120,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number, rotation?: number): SeatPosition[] => {
      if (capacity <= 1) return [{ x: 0, y: 0 }];
      const width = customWidth || 120;
      const height = customHeight || 120;
      const positions: SeatPosition[] = [];
      
      // Distribute seats evenly around the square
      const perimeter = 2 * (width + height);
      const seatSpacing = perimeter / capacity;
      
      for (let i = 0; i < capacity; i++) {
        const distance = i * seatSpacing;
        let baseX: number, baseY: number;
        
        if (distance < width) {
          // Top side
          baseX = -(width / 2) + distance;
          baseY = -(height / 2) - 20;
        } else if (distance < width + height) {
          // Right side
          baseX = (width / 2) + 20;
          baseY = -(height / 2) + (distance - width);
        } else if (distance < 2 * width + height) {
          // Bottom side
          baseX = (width / 2) - (distance - width - height);
          baseY = (height / 2) + 20;
        } else {
          // Left side
          baseX = -(width / 2) - 20;
          baseY = (height / 2) - (distance - 2 * width - height);
        }
        
        if (rotation && rotation !== 0) {
          const rotated = rotatePoint(baseX, baseY, rotation);
          positions.push(rotated);
        } else {
          positions.push({ x: baseX, y: baseY });
        }
      }
      
      return positions;
    }
  },
  sweetheart: {
    width: 120,
    height: 60,
    seatPositions: (capacity: number, customWidth?: number, customHeight?: number, rotation?: number): SeatPosition[] => {
      const width = customWidth || 120;
      const height = customHeight || 60;
      const positions: SeatPosition[] = [];
      
      // Sweetheart table has exactly 2 seats - one on each side
      if (capacity >= 1) {
        positions.push({ x: -(width / 2) - 15, y: 0 }); // Left side
      }
      if (capacity >= 2) {
        positions.push({ x: (width / 2) + 15, y: 0 }); // Right side
      }
      
      return positions;
    }
  }
};

export const getTableShape = (type: string): TableShape => {
  return TABLE_SHAPES[type] || TABLE_SHAPES.round;
};
