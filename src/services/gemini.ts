import { GoogleGenAI } from "@google/genai";
import { Task } from "../types";

const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export async function suggestToolsForTask(taskText: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3-4 specific digital tools or apps that would help someone complete this task: "${taskText}". 
      Return ONLY a comma-separated list of tool names. No descriptions.`,
    });

    const text = response.text || "";
    return text.split(",").map(s => s.trim()).filter(Boolean);
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Notes", "Calendar", "Browser"];
  }
}

export async function analyzeProductivity(tasks: Task[]): Promise<string> {
  if (tasks.length === 0) return "Add some tasks to get started!";
  
  try {
    const taskList = tasks.map(t => `- ${t.text} (${t.completed ? 'Done' : 'Pending'})`).join("\n");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this to-do list and provide a one-sentence motivational insight or tip for focus:
      ${taskList}`,
    });
    return response.text || "Stay focused on your goals!";
  } catch (error) {
    return "Keep pushing forward!";
  }
}

export async function chatWithGuruji(message: string, currentTasks: Task[]): Promise<string> {
  try {
    const taskContext = currentTasks.length > 0 
      ? `The user's current tasks are: ${currentTasks.map(t => t.text).join(", ")}.`
      : "The user has no tasks currently.";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `You are "Focus Guruji", a wise sage and productivity guide inspired by ancient Indian wisdom (Dhyaan and Sadhana). 
        You address the user as "Vatsa" (child/student) or "Seeker". 
        Your goal is to guide them through their "Sadhana" (practice/tasks) and help them maintain "Dhyaan" (focus).
        
        CRITICAL: You are deeply knowledgeable about ancient Indian epics like the "Mahabharata", "Ramayana", and the "Bhagavad Gita". 
        When appropriate, use metaphors, stories, or verses (shlokas) from these sagas to illustrate your points about focus, duty (Dharma), and perseverance. 
        For example, mention Arjuna's unwavering focus on the bird's eye, or Krishna's teachings on Nishkama Karma (selfless action).
        
        When they mention distractions like Instagram or YouTube, remind them of the "Maya" (illusion) of digital noise and give them a Vedic-inspired technique to return to their "Sankalpa" (intention).
        Keep your answers concise, powerful, and deeply insightful. Use a tone that is authoritative yet compassionate.
        ${taskContext}
        Always encourage the user to complete their tasks to earn "Karma Points" and maintain the purity of their focus stream.`,
      }
    });

    return response.text || "Focus is the bridge between goals and accomplishment. Stay on the path.";
  } catch (error) {
    console.error("Guruji Error:", error);
    return "The mind is like water; when it is turbulent, it is difficult to see. When it is calm, everything becomes clear. Return to your breath and your task.";
  }
}
