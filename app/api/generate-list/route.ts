import { OpenAI } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { description, categories, weddingDate } = body;

    let prompt = `Generate a wedding-related prep to-do list based on the user's description. Your primary goal is to create a logical and stress-free timeline that does not overwhelm the user with having too many to do items for a single day.\n`;
    prompt += `\n--- CRITICAL SCHEDULING RULES ---\n`;
    prompt += `1. **Distribute Tasks:** Spread the tasks out over different days between today and the wedding date. A user's wedding is in the future, so their to-do list should reflect that. Do not create all to do itmes for today.\n`;
    prompt += `2. **Avoid Overwhelming the User:** Do NOT cluster many tasks on a single day. The goal is a manageable schedule. The earliest one or two tasks can be due today, but all subsequent tasks must be logically spaced out on future dates.\n`;
    prompt += `3. **Intelligent Time-of-Day Scheduling:** If multiple to do must fall on the same day, space them out by several hours. Assign times that make sense for the item. For example, vendor appointments should be during business hours (e.g., 10:00 AM, 2:30 PM), not at 8:00 PM. Do not use the same time for all tasks on a given day.\n`;
    prompt += `**EXAMPLE:** If three tasks are due on the same day, assign them times like 10:00, 13:00, and 15:00, not all at 17:00.\n`;
    prompt += `\n--- CONTENT AND FORMATTING RULES ---\n`;
    prompt += `Based on the following description, generate a JSON object with a list name and an array of tasks. Each task should have a name, a short note, a deadline (in YYYY-MM-DDTHH:mm format), and a category. Use only these categories unless a new one is truly unique: ${Array.isArray(categories) && categories.length > 0 ? categories.join(', ') : 'any relevant category'}. If you must create a new category, mark it with [NEW] at the end of the category name.\n`;
    prompt += `IMPORTANT: All deadlines must be today or in the future (never before today). Do not generate any deadlines in the past.\n`;
    prompt += `IMPORTANT: Never use "Uncategorized", "Needs Category", "Other", or any generic placeholder as a category. Every task must have a specific, relevant category. If you create a new category, make it descriptive and meaningful, and mark it with [NEW]. If you cannot determine a category, use the most relevant existing category instead, but NEVER use "Uncategorized", "Needs Category", or "Other".\n`;
    if (weddingDate) {
      prompt += `The user's wedding date is ${weddingDate}. Generate deadlines relative to this date (e.g., '2 weeks before the wedding'). For all to-do items except those clearly related to the honeymoon or post-wedding, deadlines must not be after the wedding date. Only honeymoon or post-wedding tasks may have deadlines after the wedding date.\n`;
    }
    prompt += `\nDescription: ${description}\n\nReturn only valid JSON in this format:\n{\n  "name": "List Name",\n  "tasks": [\n    { "name": "Task 1", "note": "...", "deadline": "YYYY-MM-DDTHH:mm", "category": "..." },\n    ...\n  ]\n}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates structured to-do lists in JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated by OpenAI");
    }

    // Try to parse as JSON
    let result;
    try {
      // Find the first { ... } block in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      throw new Error("Failed to parse AI response as JSON");
    }
    if (!result || !result.name || !Array.isArray(result.tasks)) {
      throw new Error("AI response did not contain a valid list");
    }

    // --- Post-process: Space out tasks on the same day and across days if needed ---
    if (Array.isArray(result.tasks)) {
      let tasks: any[] = result.tasks;
      const today = new Date();
      today.setHours(0,0,0,0);
      let wedding: Date | null = null;
      if (weddingDate) {
        wedding = new Date(weddingDate);
        wedding.setHours(0,0,0,0);
      }
      // If too many tasks on a single day, redistribute
      const maxPerDay = 2;
      // Sort tasks by deadline
      tasks = tasks.sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
      let startDate = new Date(today);
      let redistributed: any[] = [];
      let i = 0;
      while (i < tasks.length) {
        let dayTasks = tasks.slice(i, i + maxPerDay);
        // Assign this batch to startDate
        dayTasks.forEach((task: any, idx: number) => {
          const dateObj = new Date(startDate);
          // We'll assign time slots later
          task.deadline = dateObj.toISOString().slice(0, 10);
        });
        redistributed = redistributed.concat(dayTasks);
        i += maxPerDay;
        // Move to next day
        startDate = new Date(startDate);
        startDate.setDate(startDate.getDate() + 1);
        if (wedding && startDate > wedding) {
          startDate = new Date(wedding);
        }
      }
      // Now group by date again
      const tasksByDate: { [date: string]: any[] } = {};
      redistributed.forEach((task: any) => {
        const dateKey = task.deadline;
        if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
        tasksByDate[dateKey].push(task);
      });
      // Assign unique times per day
      Object.entries(tasksByDate).forEach(([date, dayTasks]) => {
        const timeSlots = [10, 13, 15, 16.5, 18, 19.5, 21];
        dayTasks.forEach((task: any, idx: number) => {
          const hour = timeSlots[idx % timeSlots.length];
          const h = Math.floor(hour);
          const m = Math.round((hour - h) * 60);
          const dateObj = new Date(date + 'T00:00:00');
          dateObj.setHours(h, m, 0, 0);
          task.deadline = dateObj.toISOString().slice(0, 16);
        });
      });
      result.tasks = redistributed;
    }

    // Ensure all deadlines are today or later
    const today = new Date();
    today.setHours(0,0,0,0);
    let soonestDeadline = null;
    let warning = '';
    if (Array.isArray(result.tasks)) {
      // --- Post-process: Space out tasks on the same day ---
      const tasksByDate: { [date: string]: any[] } = {};
      result.tasks.forEach(task => {
        if (task.deadline) {
          const d = new Date(task.deadline);
          if (d < today) {
            task.deadline = today.toISOString().slice(0, 10);
          }
          if (!soonestDeadline || new Date(task.deadline) < new Date(soonestDeadline)) {
            soonestDeadline = task.deadline;
          }
          // Group by date (YYYY-MM-DD)
          const dateKey = d.toISOString().slice(0, 10);
          if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
          tasksByDate[dateKey].push(task);
        }
      });
      // Assign times for tasks on the same day
      Object.entries(tasksByDate).forEach(([date, tasks]) => {
        // Always assign unique times, overwriting any existing time
        const timeSlots = [10, 13, 15, 16.5, 18, 19.5, 21];
        tasks.forEach((task, idx) => {
          const hour = timeSlots[idx % timeSlots.length];
          const h = Math.floor(hour);
          const m = Math.round((hour - h) * 60);
          const dateObj = new Date(date + 'T00:00:00');
          dateObj.setHours(h, m, 0, 0);
          task.deadline = dateObj.toISOString().slice(0, 16);
        });
      });
    }
    // Add warning if soonest deadline is today and there are many tasks, or if wedding is very soon
    if (soonestDeadline === today.toISOString().slice(0, 10) && result.tasks.length > 10) {
      warning = 'Heads up! Your first to-do is due today and there are a lot of tasks. This may be challenging to accomplish in time.';
    }
    if (weddingDate) {
      const wedding = new Date(weddingDate);
      if (!isNaN(wedding.getTime())) {
        const daysToWedding = Math.ceil((wedding.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysToWedding < 60 && result.tasks.length > 10) {
          warning = 'Your wedding is coming up soon and there are many tasks. Consider adjusting your timeline for a less stressful experience!';
        }
      }
    }
    result.warning = warning;
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in /api/generate-list:", error);
    return new NextResponse("Failed to generate list.", { status: 500 });
  }
} 