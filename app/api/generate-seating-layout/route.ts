import { NextRequest, NextResponse } from 'next/server';

interface TableLayoutRequest {
  prompt: string;
  guestCount: number;
}

interface TableLayoutResponse {
  tables: Array<{
    name: string;
    type: 'round' | 'long';
    capacity: number;
    description: string;
  }>;
  totalCapacity: number;
  layout: string;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, guestCount }: TableLayoutRequest = await request.json();

    if (!prompt || !guestCount) {
      return NextResponse.json({ error: 'Prompt and guest count are required' }, { status: 400 });
    }

    // Call your AI service (this could be OpenAI, Claude, or your own model)
    const aiResponse = await generateTableLayoutWithAI(prompt, guestCount);

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Error generating table layout:', error);
    return NextResponse.json({ error: 'Failed to generate table layout' }, { status: 500 });
  }
}

async function generateTableLayoutWithAI(prompt: string, guestCount: number): Promise<TableLayoutResponse> {
  // For now, let's create a smart fallback that generates layouts based on common patterns
  // In the future, this would call your AI service
  
  const words = prompt.toLowerCase();
  
  // Determine table type preference
  const prefersRound = words.includes('round') || words.includes('circular');
  const prefersLong = words.includes('long') || words.includes('rectangular') || words.includes('farmhouse');
  
  // Determine capacity preference
  const capacityMatch = prompt.match(/(\d+)\s*seats?/);
  const preferredCapacity = capacityMatch ? parseInt(capacityMatch[1]) : 8;
  
  // Determine layout style
  const isUShaped = words.includes('u-shape') || words.includes('u shaped');
  const isScattered = words.includes('scattered') || words.includes('random');
  const isRows = words.includes('row') || words.includes('line');
  
  const tables: Array<{
    name: string;
    type: 'round' | 'long';
    capacity: number;
    description: string;
  }> = [];

  // Always start with sweetheart table
  tables.push({
    name: 'Sweetheart Table',
    type: 'long',
    capacity: 2,
    description: 'Special table for the happy couple'
  });

  const remainingGuests = guestCount - 2;
  
  if (remainingGuests <= 0) {
    return {
      tables,
      totalCapacity: 2,
      layout: 'Intimate'
    };
  }

  // Generate guest tables based on preferences
  const tableType = prefersRound ? 'round' : (prefersLong ? 'long' : 'round');
  const seatsPerTable = Math.min(preferredCapacity, 12); // Cap at 12 seats
  
  // Calculate number of tables needed
  const numTables = Math.ceil(remainingGuests / seatsPerTable);
  
  // Generate table names based on guest count and preferences
  const tableNames = generateTableNames(numTables, guestCount, words);
  
  for (let i = 0; i < numTables; i++) {
    const capacity = i === numTables - 1 
      ? remainingGuests - (i * seatsPerTable) // Last table gets remaining guests
      : seatsPerTable;
      
    tables.push({
      name: tableNames[i] || `Guest Table ${i + 1}`,
      type: tableType,
      capacity,
      description: generateTableDescription(tableNames[i], capacity)
    });
  }

  const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0);
  
  let layout = 'Classic';
  if (isUShaped) layout = 'U-shaped';
  else if (isScattered) layout = 'Scattered';
  else if (isRows) layout = 'Linear rows';
  else if (guestCount <= 20) layout = 'Intimate';
  else if (guestCount <= 50) layout = 'Traditional';
  else layout = 'Large reception';

  return {
    tables,
    totalCapacity,
    layout
  };
}

function generateTableNames(numTables: number, guestCount: number, promptWords: string): string[] {
  const names: string[] = [];
  
  // Check for family mentions
  const hasBrideFamily = promptWords.includes('bride') || promptWords.includes('bride\'s');
  const hasGroomFamily = promptWords.includes('groom') || promptWords.includes('groom\'s');
  const hasFriends = promptWords.includes('friend') || promptWords.includes('college') || promptWords.includes('work');
  const hasParty = promptWords.includes('bridal party') || promptWords.includes('wedding party');
  
  let nameIndex = 0;
  
  if (hasParty && nameIndex < numTables) {
    names[nameIndex++] = 'Bridal Party Table';
  }
  
  if (hasBrideFamily && nameIndex < numTables) {
    names[nameIndex++] = 'Bride\'s Family';
  }
  
  if (hasGroomFamily && nameIndex < numTables) {
    names[nameIndex++] = 'Groom\'s Family';
  }
  
  if (hasFriends && nameIndex < numTables) {
    names[nameIndex++] = 'College Friends';
  }
  
  if (hasFriends && nameIndex < numTables) {
    names[nameIndex++] = 'Work Friends';
  }
  
  // Fill remaining with generic names
  for (let i = nameIndex; i < numTables; i++) {
    if (guestCount <= 20) {
      names[i] = `Table ${String.fromCharCode(65 + i)}`; // A, B, C, etc.
    } else {
      names[i] = `Guest Table ${i + 1}`;
    }
  }
  
  return names;
}

function generateTableDescription(tableName: string, capacity: number): string {
  if (tableName.includes('Family')) {
    return 'Family seating';
  } else if (tableName.includes('Friends')) {
    return 'Friends seating';
  } else if (tableName.includes('Party')) {
    return 'Wedding party seating';
  } else {
    return `${capacity} guest seats`;
  }
}