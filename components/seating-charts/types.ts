// Import types from the main seatingChart types file
import type { Guest, SeatingChart, TableType, GuestColumn } from '../../types/seatingChart';

export type WizardStep = 'guests' | 'tables' | 'organization';

export interface WizardState {
  currentStep: WizardStep;
  guests: Guest[];
  tableLayout: {
    tables: TableType[];
    totalCapacity: number;
  };
  organizationChoice: 'ai' | 'manual' | 'skip' | null;
  chartName: string;
  eventType: string;
  description?: string;
}

// Re-export types from the main seatingChart types file
export type { Guest, SeatingChart, TableType, GuestColumn } from '../../types/seatingChart';
