/**
 * Initialize scheduled tasks on server startup
 * This ensures the credit refresh automation runs
 */

// COMMENTED OUT: Scheduled tasks causing permission errors
// Only run on server side
// if (typeof window === 'undefined') {
//   // Import and start the scheduled task manager
//   import('@/utils/scheduledTasks').then(({ scheduledTaskManager }) => {
//     console.log('🚀 Starting scheduled task manager...');
//     scheduledTaskManager.start();
//     console.log('✅ Scheduled task manager started successfully');
//   }).catch((error) => {
//     console.error('❌ Failed to start scheduled task manager:', error);
//   });
// }
