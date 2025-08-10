// utils/assigneeAvatarColors.ts

// Color palette from the app's category system
const assigneeAvatarColors = [
  "#A85C36", // Primary accent color
  "#8B4513", // Dark brown
  "#2F4F4F", // Dark slate
  "#8A2BE2", // Purple
  "#FF69B4", // Pink
  "#32CD32", // Green
  "#4169E1", // Blue
  "#FFD700", // Gold
  "#DC143C", // Red
  "#FF1493", // Deep pink
  "#00CED1", // Cyan
  "#696969", // Dim gray
  "#654d74", // From categoryStyle.ts
  "#424d6b", // From categoryStyle.ts
  "#966b1f", // From categoryStyle.ts
  "#7a7917", // From categoryStyle.ts
  "#52862b", // From categoryStyle.ts
  "#008f4f", // From categoryStyle.ts
  "#00957d", // From categoryStyle.ts
  "#4c8076", // From categoryStyle.ts
  "#55433b", // From categoryStyle.ts
  "#c4515c", // From categoryStyle.ts
  "#a84baa", // From categoryStyle.ts
  "#5269cb"  // From categoryStyle.ts
];

// Function to get a deterministic color for an assignee based on their ID
export const getAssigneeAvatarColor = (assigneeId: string): string => {
  if (!assigneeId) return assigneeAvatarColors[0];
  
  // Use a simple hash to pick a deterministic color from the palette
  let hash = 0;
  for (let i = 0; i < assigneeId.length; i++) {
    hash = assigneeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % assigneeAvatarColors.length;
  return assigneeAvatarColors[index];
};

// Function to get a color for a specific role (for consistent role-based colors)
export const getRoleBasedAvatarColor = (roleType?: string): string => {
  switch (roleType) {
    case 'partner':
      return "#FF69B4"; // Pink for partner
    case 'planner':
      return "#8A2BE2"; // Purple for planner
    case 'user':
      return "#A85C36"; // Primary accent for user
    default:
      return assigneeAvatarColors[0];
  }
};
