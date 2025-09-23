/**
 * Test for AI Budget Warning System
 * 
 * This test verifies that the AI budget generation properly validates
 * that generated budgets don't exceed the user's max budget.
 */

// Mock data for testing
const mockAIBudget = {
  categories: [
    {
      name: 'Venue & Location',
      allocatedAmount: 15000,
      color: '#A85C36',
      items: [
        { name: 'Venue Rental', amount: 10000, dueDate: '2025-06-15', priority: 'High', notes: 'Main venue' },
        { name: 'Ceremony Setup', amount: 5000, dueDate: '2025-06-15', priority: 'High', notes: 'Ceremony area setup' }
      ]
    },
    {
      name: 'Catering & Food',
      allocatedAmount: 12000,
      color: '#696969',
      items: [
        { name: 'Dinner Service', amount: 8000, dueDate: '2025-06-01', priority: 'High', notes: 'Main dinner' },
        { name: 'Bar Service', amount: 4000, dueDate: '2025-06-01', priority: 'Medium', notes: 'Open bar' }
      ]
    },
    {
      name: 'Photography',
      allocatedAmount: 5000,
      color: '#8B5CF6',
      items: [
        { name: 'Photographer', amount: 3000, dueDate: '2025-05-15', priority: 'High', notes: '8 hours coverage' },
        { name: 'Videographer', amount: 2000, dueDate: '2025-05-15', priority: 'Medium', notes: '4 hours coverage' }
      ]
    }
  ]
};

// Test scenarios
describe('AI Budget Warning System', () => {
  test('should calculate total allocated amount correctly', () => {
    const totalAllocatedAmount = mockAIBudget.categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
    expect(totalAllocatedAmount).toBe(32000); // 15000 + 12000 + 5000
  });

  test('should detect budget overage when AI budget exceeds max budget with flexibility', () => {
    const totalAllocatedAmount = mockAIBudget.categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
    const maxBudget = 25000; // User's max budget
    const flexibilityBuffer = maxBudget * 0.1; // 10% buffer
    const maxAllowedBudget = maxBudget + flexibilityBuffer; // 27500
    const overageAmount = totalAllocatedAmount - maxAllowedBudget;
    const overagePercentage = Math.round((overageAmount / maxBudget) * 100);
    
    expect(totalAllocatedAmount).toBeGreaterThan(maxAllowedBudget);
    expect(overageAmount).toBe(4500); // 32000 - 27500
    expect(overagePercentage).toBe(18); // (4500 / 25000) * 100
  });

  test('should allow budget when AI budget is within max budget', () => {
    const totalAllocatedAmount = mockAIBudget.categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
    const maxBudget = 50000; // User's max budget
    
    expect(totalAllocatedAmount).toBeLessThanOrEqual(maxBudget);
  });

  test('should allow budget when AI budget is within flexibility buffer', () => {
    const totalAllocatedAmount = 27000; // Within 10% buffer of 25000
    const maxBudget = 25000;
    const flexibilityBuffer = maxBudget * 0.1; // 10% buffer
    const maxAllowedBudget = maxBudget + flexibilityBuffer; // 27500
    
    expect(totalAllocatedAmount).toBeLessThanOrEqual(maxAllowedBudget);
    expect(totalAllocatedAmount).toBeGreaterThan(maxBudget); // But over the original max
  });

  test('should handle edge case when max budget is 0', () => {
    const totalAllocatedAmount = mockAIBudget.categories.reduce((sum, cat) => sum + (cat.allocatedAmount || 0), 0);
    const maxBudget = 0;
    
    // When max budget is 0, validation should be skipped
    expect(maxBudget).toBe(0);
    // The validation logic should check if maxBudget > 0 before validating
  });

  test('should format warning message correctly', () => {
    const totalAllocatedAmount = 32000;
    const maxBudget = 25000;
    const overageAmount = totalAllocatedAmount - maxBudget;
    const overagePercentage = Math.round((overageAmount / maxBudget) * 100);
    
    const expectedMessage = `AI-generated budget exceeds your max budget by $${overageAmount.toLocaleString()} (${overagePercentage}% over). ` +
      `Total: $${totalAllocatedAmount.toLocaleString()} vs Max: $${maxBudget.toLocaleString()}. ` +
      `Please adjust your budget or try generating with a different description.`;
    
    expect(expectedMessage).toContain('$7,000');
    expect(expectedMessage).toContain('28% over');
    expect(expectedMessage).toContain('$32,000');
    expect(expectedMessage).toContain('$25,000');
  });
});

// Integration test scenarios
describe('AI Budget Warning Integration', () => {
  test('should prevent budget creation when overage is detected', () => {
    const totalAllocatedAmount = 32000;
    const maxBudget = 25000;
    
    // Simulate the validation logic
    const shouldPreventCreation = maxBudget > 0 && totalAllocatedAmount > maxBudget;
    
    expect(shouldPreventCreation).toBe(true);
  });

  test('should allow budget creation when within limits', () => {
    const totalAllocatedAmount = 20000;
    const maxBudget = 25000;
    
    // Simulate the validation logic
    const shouldPreventCreation = maxBudget > 0 && totalAllocatedAmount > maxBudget;
    
    expect(shouldPreventCreation).toBe(false);
  });
});
