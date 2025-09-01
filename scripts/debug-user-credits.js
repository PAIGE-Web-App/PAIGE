#!/usr/bin/env node

/**
 * Debug script for user credits
 * Run with: node scripts/debug-user-credits.js
 */

const fetch = require('node-fetch');

async function debugUserCredits() {
  try {
    console.log('🔍 Debugging user credits for Davey Jones...');
    
    // You'll need to replace this with your actual user ID
    // You can find this in the admin panel or from your Firebase console
    const userId = 'your-user-id-here'; // Replace with actual user ID
    
    if (userId === 'your-user-id-here') {
      console.log('❌ Please replace "your-user-id-here" with your actual user ID');
      console.log('   You can find this in the admin panel URL or Firebase console');
      return;
    }
    
    const response = await fetch('http://localhost:3000/api/debug/user-credits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Debug failed:', errorData);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Debug completed!');
    console.log('\n📊 User Information:');
    console.log(`   Email: ${result.userData.email}`);
    console.log(`   Role: ${result.userData.role}`);
    console.log(`   User Type: ${result.userData.userType}`);
    console.log(`   Subscription Tier: ${result.userData.subscriptionTier}`);
    
    console.log('\n💰 Current Credits:');
    if (result.credits) {
      console.log(`   Daily Credits: ${result.credits.dailyCredits}`);
      console.log(`   Bonus Credits: ${result.credits.bonusCredits}`);
      console.log(`   Total Used: ${result.credits.totalCreditsUsed}`);
      console.log(`   Last Refresh: ${result.credits.lastCreditRefresh}`);
      console.log(`   Credits User Type: ${result.credits.userType}`);
      console.log(`   Credits Subscription Tier: ${result.credits.subscriptionTier}`);
    } else {
      console.log('   No credits record found');
    }
    
    console.log('\n🎯 Expected Credits:');
    console.log(`   Monthly Credits: ${result.expectedCredits.monthlyCredits}`);
    console.log(`   Rollover Credits: ${result.expectedCredits.rolloverCredits}`);
    console.log(`   Refresh Frequency: ${result.expectedCredits.creditRefresh}`);
    console.log(`   AI Features: ${result.expectedCredits.aiFeatures.join(', ')}`);
    
    console.log('\n🔄 Refresh Status:');
    console.log(`   Needs Refresh: ${result.refreshStatus.needsRefresh}`);
    console.log(`   Last Refresh: ${result.refreshStatus.lastRefresh}`);
    console.log(`   Current Time: ${result.refreshStatus.currentTime}`);
    console.log(`   Last Refresh Day: ${result.refreshStatus.lastRefreshDay}`);
    console.log(`   Current Day: ${result.refreshStatus.currentDay}`);
    
    // Analysis
    console.log('\n🔍 Analysis:');
    if (!result.credits) {
      console.log('   ❌ No credits record found - user needs credit initialization');
    } else if (result.credits.dailyCredits !== result.expectedCredits.monthlyCredits) {
      console.log(`   ⚠️  Credit mismatch: has ${result.credits.dailyCredits}, should have ${result.expectedCredits.monthlyCredits}`);
    } else {
      console.log('   ✅ Credits match expected amount');
    }
    
    if (result.refreshStatus.needsRefresh) {
      console.log('   🔄 User needs credit refresh');
    } else {
      console.log('   ✅ User does not need refresh');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugUserCredits();
