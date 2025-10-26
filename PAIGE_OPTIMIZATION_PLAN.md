# Paige Contextual Assistant - Optimization Plan

## 🎯 Current Issues & Optimization Opportunities

### 1. **Component Re-render Issues**

#### Problem:
- `PaigeContextualAssistant.tsx` is a 1000+ line monolithic component
- `generateSmartInsights()` runs on every `useEffect` trigger
- No memoization of expensive operations
- Chat message formatting happens on every render
- All insights logic is in a single file

#### Impact:
- Unnecessary re-renders when `currentData` changes
- CPU-intensive insight generation on every update
- Poor performance with large todo lists (10+ items)
- Difficult to maintain and test

---

### 2. **Missing React Optimization Patterns**

#### Current State:
```typescript
// ❌ No memoization
export default function PaigeContextualAssistant({ currentData }) {
  const [currentInsights, setCurrentInsights] = useState([]);
  
  useEffect(() => {
    // This runs every time currentData changes
    const insights = generateSmartInsights(); // Heavy operation
    setCurrentInsights(insights);
  }, [currentData]); // Triggers on ANY currentData change
}
```

#### Should Be:
```typescript
// ✅ With memoization
const PaigeContextualAssistant = React.memo(({ currentData }) => {
  // Memoize expensive computations
  const insights = useMemo(() => 
    generateSmartInsights(currentData),
    [
      currentData?.selectedListId, // Only deps that matter
      currentData?.todoItems?.length,
      currentData?.daysUntilWedding
    ]
  );
  
  // Memoize callbacks
  const handleDismiss = useCallback((id) => {
    setDismissedInsights(prev => new Set([...prev, id]));
  }, []);
});
```

---

### 3. **Componentization Opportunities**

#### Current Structure:
```
PaigeContextualAssistant.tsx (1017 lines)
  ├─ Insight generation logic (400 lines)
  ├─ Chat interface (300 lines)
  ├─ Message formatting (100 lines)
  ├─ Event handling (100 lines)
  └─ UI rendering (117 lines)
```

#### Proposed Structure:
```
components/paige/
  ├─ PaigeWidget.tsx (Main component, 150 lines)
  ├─ PaigeInsights.tsx (Insights display, 100 lines)
  ├─ PaigeChat.tsx (Chat interface, 150 lines)
  ├─ PaigeChatMessage.tsx (Individual message, 50 lines)
  ├─ PaigeFloatingButton.tsx (Collapsed state, 50 lines)
  └─ hooks/
      ├─ usePaigeInsights.ts (Insight generation, 300 lines)
      ├─ usePaigeChat.ts (Chat logic, 200 lines)
      └─ usePaigeActions.ts (Todo manipulation, 100 lines)
  └─ utils/
      ├─ insightGenerators.ts (Insight logic by type, 200 lines)
      ├─ messageFormatters.ts (Chat formatting, 100 lines)
      └─ vendorRouting.ts (Smart routing, 100 lines)
```

---

### 4. **Specific Optimization Opportunities**

#### A. **Insight Generation**
**Current:** Runs entire insight generation on every `currentData` change
```typescript
// ❌ Recalculates everything every time
useEffect(() => {
  const insights = generateSmartInsights();
  setCurrentInsights(insights);
}, [context, currentData, dismissedInsights]);
```

**Optimized:** Break into smaller, memoized functions
```typescript
// ✅ Only recalculate what changed
const overdueTasks = useMemo(() => 
  currentData?.todoItems?.filter(todo => 
    !todo.isCompleted && todo.deadline && new Date(todo.deadline) < new Date()
  ) || [],
  [currentData?.todoItems]
);

const urgentInsight = useMemo(() => 
  overdueTasks.length > 0 ? createOverdueInsight(overdueTasks) : null,
  [overdueTasks]
);
```

#### B. **Chat Message Formatting**
**Current:** Formats on every render
```typescript
// ❌ Re-formats all messages on every render
{chatMessages.map((message, index) => (
  <div dangerouslySetInnerHTML={{
    __html: formatChatMessage(message.content) // Called every render
  }} />
))}
```

**Optimized:** Memoize formatted content
```typescript
// ✅ Format once, cache result
const FormattedMessage = React.memo(({ content }) => {
  const formatted = useMemo(() => formatChatMessage(content), [content]);
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
});
```

#### C. **Event Listeners**
**Current:** Creates new functions on every render
```typescript
// ❌ New function on every render
const handleSendMessage = async () => { /* ... */ };
```

**Optimized:** Memoize with useCallback
```typescript
// ✅ Function reference stays stable
const handleSendMessage = useCallback(async () => {
  /* ... */
}, [chatInput, chatMessages, currentData]);
```

#### D. **Smart Vendor Routing**
**Current:** Inline logic repeated multiple times
```typescript
// ❌ Duplicated logic in Priority 3 and Priority 10
const getSmartAction = (todoName: string) => {
  const name = todoName.toLowerCase();
  if (name.includes('wedding band')) {
    if (name.includes('jewelry') || name.includes('ring')) {
      return { label: 'Browse Jewelers', url: '/vendors/catalog/jewelry_store' };
    }
    return { label: 'Find Wedding Bands', url: '/vendors/catalog/band' };
  }
  // ... 20 more if statements
};
```

**Optimized:** Extract to utility with lookup table
```typescript
// ✅ Centralized, testable, cacheable
const VENDOR_KEYWORDS = {
  jewelry: {
    keywords: ['ring', 'jewelry', 'jeweler', 'diamond'],
    category: 'jewelry_store',
    label: 'Browse Jewelers'
  },
  band: {
    keywords: ['band', 'music', 'musician'],
    category: 'band',
    label: 'Find Musicians'
  },
  // ...
};

export function getVendorRouting(todoName: string, location?: string) {
  // Fast lookup + caching
}
```

---

### 5. **Performance Metrics**

#### Current Performance (Estimated):
- **Initial Render**: ~200ms (insight generation)
- **Re-render on todo change**: ~150ms
- **Chat message send**: ~500ms (API call) + 50ms (formatting)
- **Bundle size**: ~45KB (all logic in one file)

#### Target Performance:
- **Initial Render**: ~50ms (memoized, cached)
- **Re-render on todo change**: ~10ms (only affected insights)
- **Chat message send**: ~500ms (API call) + 5ms (pre-formatted)
- **Bundle size**: ~35KB (code splitting, tree shaking)

---

## 🚀 Optimization Strategy

### Phase 1: Non-Breaking Optimizations (Immediate)
**Goal:** Improve performance without changing architecture
**Time:** 1-2 hours
**Risk:** Low

1. ✅ Add `React.memo` to main component
2. ✅ Memoize insight generation with `useMemo`
3. ✅ Memoize callbacks with `useCallback`
4. ✅ Optimize `useEffect` dependencies
5. ✅ Extract and memoize message formatting
6. ✅ Add display names for React DevTools

### Phase 2: Extract Custom Hooks (Medium Priority)
**Goal:** Separate concerns, improve testability
**Time:** 2-3 hours
**Risk:** Low-Medium

1. ✅ Extract `usePaigeInsights` hook
2. ✅ Extract `usePaigeChat` hook (separate from existing one)
3. ✅ Extract `usePaigeActions` hook (todo manipulation)
4. ✅ Keep component as "dumb" UI layer

### Phase 3: Componentization (Lower Priority)
**Goal:** Improve maintainability, enable code splitting
**Time:** 4-5 hours
**Risk:** Medium

1. ✅ Split into sub-components
2. ✅ Create shared types file
3. ✅ Extract utility functions
4. ✅ Add unit tests for each piece

### Phase 4: Advanced Optimizations (Future)
**Goal:** Maximum performance for production
**Time:** 6-8 hours
**Risk:** Medium-High

1. ⏳ Lazy load chat interface (only load when opened)
2. ⏳ Virtualize insight list (if >5 insights)
3. ⏳ Debounce insight generation (500ms)
4. ⏳ Cache insights in sessionStorage
5. ⏳ Web Worker for insight generation
6. ⏳ Preload vendor routes

---

## 📋 Implementation Checklist

### Phase 1: Non-Breaking Optimizations

- [ ] Wrap component in `React.memo`
- [ ] Add memoization to insight generation
  - [ ] Memoize `relevantTodos` filtering
  - [ ] Memoize `incompleteTodos` calculation
  - [ ] Memoize `todosWithoutDeadlines`
  - [ ] Memoize individual insight generation
- [ ] Memoize all callback functions
  - [ ] `handleSendMessage`
  - [ ] `handleAddDeadlines`
  - [ ] `handleLocalCommands`
  - [ ] `handleTodoAction`
  - [ ] `dismissInsight`
- [ ] Optimize `useEffect` dependencies
  - [ ] Replace `currentData` with specific fields
  - [ ] Add dependency array comments
- [ ] Extract and memoize `formatChatMessage`
- [ ] Add display names for debugging

### Phase 2: Extract Custom Hooks

- [ ] Create `hooks/paige/usePaigeInsights.ts`
  - [ ] Move insight generation logic
  - [ ] Export typed insights array
  - [ ] Include dismiss functionality
- [ ] Create `hooks/paige/usePaigeChatLogic.ts`
  - [ ] Move chat state management
  - [ ] Move message sending logic
  - [ ] Move local command handling
- [ ] Create `hooks/paige/usePaigeActions.ts`
  - [ ] Move todo manipulation events
  - [ ] Export typed action handlers
- [ ] Update main component to use hooks

### Phase 3: Componentization

- [ ] Create `components/paige/` directory
- [ ] Extract `PaigeFloatingButton.tsx`
- [ ] Extract `PaigeInsightsList.tsx`
- [ ] Extract `PaigeInsightCard.tsx`
- [ ] Extract `PaigeChat.tsx`
- [ ] Extract `PaigeChatMessage.tsx`
- [ ] Create `types/paige.ts` for shared types
- [ ] Create `utils/paige/` for utilities
  - [ ] `insightGenerators.ts`
  - [ ] `messageFormatters.ts`
  - [ ] `vendorRouting.ts`
- [ ] Update main component to compose sub-components

---

## 🎯 Success Criteria

### Performance:
- [ ] Initial render < 100ms
- [ ] Re-render < 20ms
- [ ] No unnecessary re-renders (verified in React DevTools)
- [ ] Bundle size reduction of 20%+

### Code Quality:
- [ ] Each file < 300 lines
- [ ] All functions < 50 lines
- [ ] No duplicated logic
- [ ] Full TypeScript type safety

### Maintainability:
- [ ] Clear separation of concerns
- [ ] Easy to add new insight types
- [ ] Easy to add new chat commands
- [ ] Easy to test individual pieces

### No Regressions:
- [ ] All existing features work identically
- [ ] No visual changes
- [ ] No UX changes
- [ ] Feature flag still works

---

## 🔧 Tools & Techniques

### Performance Profiling:
```typescript
// Before optimization
import { Profiler } from 'react';

<Profiler id="PaigeWidget" onRender={(id, phase, actualDuration) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}}>
  <PaigeContextualAssistant {...props} />
</Profiler>
```

### React DevTools:
- Use "Highlight updates" to see re-renders
- Use "Profiler" tab to measure performance
- Check "Components" tab for unnecessary renders

### Bundle Analysis:
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

---

## 📝 Notes

- Start with Phase 1 (non-breaking) first
- Test thoroughly after each change
- Use feature flag to compare before/after
- Keep git commits small and focused
- Document any breaking changes
- Add JSDoc comments to exported functions

---

**Last Updated:** October 26, 2025
**Status:** Ready for Phase 1 implementation

