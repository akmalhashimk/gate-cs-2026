import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface StudyRecommendation {
  type: 'focus_area' | 'strength' | 'review';
  subject: string;
  title: string;
  description: string;
  priority: number;
  actionUrl?: string;
}

export interface QuestionExplanation {
  explanation: string;
  keyPoints: string[];
  relatedTopics: string[];
  difficulty: number;
}

export async function generateStudyRecommendations(
  userProgress: any[],
  recentSessions: any[]
): Promise<StudyRecommendation[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an AI tutor specialized in GATE CS exam preparation. Analyze user performance data and provide personalized study recommendations. Return your response as valid JSON in the format: { \"recommendations\": [...] }"
        },
        {
          role: "user",
          content: `Based on this user's progress data: ${JSON.stringify(userProgress)} and recent sessions: ${JSON.stringify(recentSessions)}, provide 3-5 study recommendations for GATE CSE 2026 preparation.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result.recommendations || [];
  } catch (error) {
    console.error("Error generating study recommendations:", error);
    return [];
  }
}

export async function generateQuestionExplanation(
  question: string,
  options: string[],
  correctAnswer: string,
  subject: string
): Promise<QuestionExplanation> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert GATE CS instructor. Provide detailed explanations for questions with key concepts and related topics. Return your response as valid JSON."
        },
        {
          role: "user",
          content: `Explain this ${subject} question: "${question}" with options: ${options.join(', ')}. The correct answer is: ${correctAnswer}. Provide a detailed explanation with key points and related topics.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);
    return {
      explanation: result.explanation || "No explanation available",
      keyPoints: result.keyPoints || [],
      relatedTopics: result.relatedTopics || [],
      difficulty: result.difficulty || 3
    };
  } catch (error) {
    console.error("Error generating question explanation:", error);
    return {
      explanation: "Unable to generate explanation at this time.",
      keyPoints: [],
      relatedTopics: [],
      difficulty: 3
    };
  }
}

export async function generateStudyPlan(
  userGoals: string,
  currentLevel: string,
  timeAvailable: number
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a GATE CS preparation expert. Create personalized study plans based on user goals, current level, and available time. Return as valid JSON."
        },
        {
          role: "user",
          content: `Create a study plan for GATE CS 2026 with goals: ${userGoals}, current level: ${currentLevel}, daily time available: ${timeAvailable} hours.`
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error generating study plan:", error);
    return null;
  }
        }
