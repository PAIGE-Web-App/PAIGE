// Parse OpenAI response and structure data
const openaiResponse = $input.first().json.choices[0].message.content;

// Clean the response by removing markdown code blocks
const cleanResponse = openaiResponse
  .replace(/```json\n?/g, '')
  .replace(/```\n?/g, '')
  .trim();

console.log('Raw OpenAI response:', openaiResponse);
console.log('Cleaned response:', cleanResponse);

let parsedData;
try {
  parsedData = JSON.parse(cleanResponse);
} catch (parseError) {
  console.error('Failed to parse OpenAI response:', parseError);
  console.log('Raw content:', cleanResponse);
  
  // Return a fallback structure if parsing fails
  return {
    success: false,
    error: 'Failed to parse OpenAI response',
    data: {
      todos: [],
      budget: { total: 0, categories: [] },
      vendors: {
        venues: [],
        photographers: [],
        florists: [],
        caterers: [],
        music: []
      }
    }
  };
}

// Ensure vendors have proper structure
const vendors = {
  venues: parsedData.vendors?.venues || [],
  photographers: parsedData.vendors?.photographers || [],
  florists: parsedData.vendors?.florists || [],
  caterers: parsedData.vendors?.caterers || [],
  music: parsedData.vendors?.music || []
};

const result = {
  success: true,
  data: {
    todos: parsedData.todos || [],
    budget: parsedData.budget || { total: 0, categories: [] },
    vendors: vendors
  }
};

console.log('Final result:', JSON.stringify(result, null, 2));
return result;
