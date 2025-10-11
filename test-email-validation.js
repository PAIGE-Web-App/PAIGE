/**
 * Quick Test Script for Email Validation
 * Run with: node test-email-validation.js
 */

// Import the validation functions (Note: This won't work in Node.js without proper setup)
// This is just for demonstration - in practice, you'd test in the browser

const testEmails = [
  // Invalid formats
  "invalid-email",
  "@example.com",
  "test@",
  "",
  
  // Fake/test domains (should be blocked)
  "test@example.com",
  "user@test.com",
  "fake@invalid.com",
  "dummy@sample.com",
  "test@localhost",
  
  // Temporary email services (should warn)
  "user@10minutemail.com",
  "temp@guerrillamail.com",
  "throwaway@mailinator.com",
  "temp@tempmail.org",
  
  // Suspicious patterns (should warn)
  "test123@company.com",
  "fake_user@business.org",
  "dummy_email@realdomain.com",
  
  // Valid emails (should pass)
  "john@company.com",
  "jane@business.org",
  "contact@vendor.net",
  "info@weddingvenue.com",
  
  // Edge cases
  "very.long.domain.name@subdomain.example.com",
  "user+tag@domain.co.uk",
  "user@domain-with-dashes.com"
];

console.log("🧪 Testing Email Validation System\n");

testEmails.forEach((email, index) => {
  console.log(`${index + 1}. Testing: "${email}"`);
  
  // In a real test, you would call:
  // const result = validateEmail(email);
  // const message = getValidationMessage(email);
  
  // For now, just show what we expect:
  if (email.includes('example.com') || email.includes('test.com') || email.includes('invalid.com')) {
    console.log("   Expected: ❌ BLOCKED - Fake/test domain detected");
  } else if (email.includes('10minutemail') || email.includes('guerrillamail')) {
    console.log("   Expected: ⚠️ WARNING - Temporary email service");
  } else if (email.includes('test') || email.includes('fake') || email.includes('dummy')) {
    console.log("   Expected: ⚠️ WARNING - Suspicious pattern detected");
  } else if (!email.includes('@') || email === '') {
    console.log("   Expected: ❌ INVALID - Bad format");
  } else {
    console.log("   Expected: ✅ VALID - Good to go");
  }
  console.log("");
});

console.log("🎯 Key Test Scenarios:");
console.log("1. Try creating a contact with 'test@example.com'");
console.log("2. Should see red border + error message");
console.log("3. Try sending email to that contact");
console.log("4. Should be blocked at API level");
console.log("5. Check console for: '🚫 Blocked email to fake/test domain'");
console.log("\n🚀 Ready to test in your app!");
