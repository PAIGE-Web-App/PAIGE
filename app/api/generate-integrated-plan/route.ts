import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { withCreditValidation } from "../../../lib/creditMiddleware";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Main handler function
async function handleIntegratedPlanning(req: Request) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { description, totalBudget, weddingDate } = body;

    // Validate required fields
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }

    if (!totalBudget || isNaN(parseFloat(totalBudget)) || parseFloat(totalBudget) <= 0) {
      return NextResponse.json(
        { error: 'Valid total budget is required' },
        { status: 400 }
      );
    }

    let prompt = `Create an integrated wedding planning plan that includes both a detailed budget breakdown AND a comprehensive todo list. The plan should be cohesive, with budget items linked to specific planning tasks.\n`;
    prompt += `\n--- INTEGRATED PLANNING RULES ---\n`;
    prompt += `1. **Budget-Task Alignment**: Each major budget category should have corresponding planning tasks.\n`;
    prompt += `2. **Timeline Integration**: Todo tasks should be scheduled logically before the wedding date.\n`;
    prompt += `3. **Realistic Budgeting**: Distribute budget based on typical wedding costs and priorities.\n`;
    prompt += `4. **Actionable Tasks**: Each todo item should be specific and actionable.\n`;
    prompt += `5. **Vendor Coordination**: Include tasks for vendor research, booking, and coordination.\n`;
    
    prompt += `\n--- BUDGET CATEGORIES ---\n`;
    prompt += `Use these standard categories:\n`;
    prompt += `- Venue & Location\n`;
    prompt += `- Catering & Food\n`;
    prompt += `- Photography & Videography\n`;
    prompt += `- Attire & Accessories\n`;
    prompt += `- Flowers & Decorations\n`;
    prompt += `- Entertainment & Music\n`;
    prompt += `- Transportation\n`;
    prompt += `- Wedding Rings\n`;
    prompt += `- Stationery & Invitations\n`;
    prompt += `- Hair & Makeup\n`;
    prompt += `- Wedding Cake\n`;
    prompt += `- Officiant & Ceremony\n`;
    prompt += `- Miscellaneous & Contingency\n`;

    prompt += `\n--- OUTPUT FORMAT ---\n`;
    prompt += `Return only valid JSON in this format:\n`;
    prompt += `{\n`;
    prompt += `  "budget": {\n`;
    prompt += `    "categories": [\n`;
    prompt += `      {\n`;
    prompt += `        "name": "Category Name",\n`;
    prompt += `        "allocatedAmount": 5000,\n`;
    prompt += `        "items": [\n`;
    prompt += `          {\n`;
    prompt += `            "name": "Item Name",\n`;
    prompt += `            "amount": 2500,\n`;
    prompt += `            "notes": "Description or vendor notes"\n`;
    prompt += `          }\n`;
    prompt += `        ]\n`;
    prompt += `      }\n`;
    prompt += `    ]\n`;
    prompt += `  },\n`;
    prompt += `  "todoList": {\n`;
    prompt += `    "name": "Wedding Planning Checklist",\n`;
    prompt += `    "tasks": [\n`;
    prompt += `      {\n`;
    prompt += `        "name": "Task Name",\n`;
    prompt += `        "note": "Task description",\n`;
    prompt += `        "deadline": "YYYY-MM-DDTHH:mm",\n`;
    prompt += `        "category": "Category Name"\n`;
    prompt += `      }\n`;
    prompt += `    ]\n`;
    prompt += `  }\n`;
    prompt += `}\n`;

    prompt += `\nTotal Budget: $${totalBudget}\n`;
    prompt += `Wedding Description: ${description}\n`;
    if (weddingDate) {
      prompt += `Wedding Date: ${weddingDate}\n`;
      prompt += `\nIMPORTANT: All todo deadlines must be before the wedding date (${weddingDate}). Only honeymoon or post-wedding tasks may be after this date.\n`;
    }
    prompt += `\nCreate a comprehensive plan that includes:\n`;
    prompt += `1. A realistic budget breakdown totaling approximately $${totalBudget}\n`;
    prompt += `2. A detailed todo list with tasks scheduled logically before the wedding\n`;
    prompt += `3. Budget categories that align with planning tasks\n`;
    prompt += `4. Vendor research and booking tasks for major budget items`;

    console.log('Sending request to OpenAI with budget:', totalBudget, 'and description length:', description.length);
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a wedding planning expert that creates integrated budget and todo plans." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      console.error('OpenAI returned empty content');
      throw new Error("No content generated by OpenAI. Please try again.");
    }

    console.log('OpenAI response received, length:', content.length);

    // Try to parse as JSON
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in OpenAI response:', content.substring(0, 200));
        throw new Error("AI response format is invalid. Please try again.");
      }
      result = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON parsing error:', e, 'Content preview:', content.substring(0, 200));
      throw new Error("Failed to parse AI response. Please try again.");
    }

    if (!result || !result.budget || !result.todoList) {
      throw new Error("AI response did not contain valid budget and todo list");
    }

    // Validate and normalize the budget response
    const validatedBudget = {
      categories: Array.isArray(result.budget.categories) ? result.budget.categories.map((category: any) => ({
        name: category.name || "Uncategorized",
        allocatedAmount: parseFloat(category.allocatedAmount) || 0,
        items: Array.isArray(category.items) ? category.items.map((item: any) => ({
          name: item.name || "Unnamed Item",
          amount: parseFloat(item.amount) || 0,
          notes: item.notes || ""
        })) : []
      })) : []
    };

    // Validate and normalize the todo list response
    const validatedTodoList = {
      name: result.todoList.name || "Wedding Planning Checklist",
      tasks: Array.isArray(result.todoList.tasks) ? result.todoList.tasks.map((task: any) => ({
        name: task.name || "Unnamed Task",
        note: task.note || "",
        deadline: task.deadline || null,
        category: task.category || "Planning"
      })) : []
    };

    return NextResponse.json({
      budget: validatedBudget,
      todoList: validatedTodoList,
      totalAllocated: validatedBudget.categories.reduce((sum: number, cat: any) => sum + cat.allocatedAmount, 0)
    });

  } catch (error: any) {
    console.error('Error generating integrated plan:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate integrated plan' },
      { status: 500 }
    );
  }
}

// Export the POST function wrapped with credit validation
export const POST = withCreditValidation(handleIntegratedPlanning, {
  feature: 'integrated_planning',
  userIdField: 'userId',
  requireAuth: true,
  errorMessage: 'Insufficient credits for integrated planning. Please upgrade your plan to continue using AI features.'
}); 