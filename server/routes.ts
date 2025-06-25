import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { questionGenerator } from "./services/questionGenerator";
import { adaptiveLearningService } from "./services/adaptiveLearning";
import { generateQuestionExplanation, generateStudyPlan } from "./services/openai";
import { insertPracticeSessionSchema, insertUserAnswerSchema, insertStudyPlanSchema, insertStudyPlanTaskSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard route - Main entry point
  app.get("/api/dashboard/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get user data
      const user = await storage.getUser(userId);
      const analytics = await adaptiveLearningService.generateUserAnalytics(userId);
      const recentSessions = await storage.getUserPracticeSessions(userId, 5);
      const userProgress = await storage.getUserProgress(userId);
      const subjects = await storage.getAllSubjects();
      const activePlan = await storage.getActiveStudyPlan(userId);
      const recommendations = await storage.getUserAIRecommendations(userId);
      
      // Calculate subject progress with colors and icons
      const subjectProgress = userProgress.map(progress => {
        const subject = subjects.find(s => s.id === progress.subjectId);
        const accuracy = progress.totalQuestions > 0 ? 
          Math.round((progress.correctAnswers / progress.totalQuestions) * 100) : 0;
        
        return {
          id: subject?.id || 0,
          name: subject?.name || 'Unknown',
          code: subject?.code || 'UNK',
          icon: subject?.icon || '📚',
          color: subject?.color || '#6366f1',
          accuracy,
          totalQuestions: progress.totalQuestions,
          strengthLevel: progress.strengthLevel
        };
      });
      
      // Calculate days to exam (GATE 2026 is typically in February)
      const examDate = new Date('2026-02-15');
      const today = new Date();
      const daysToExam = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const dashboardData = {
        user,
        analytics,
        recentSessions,
        subjectProgress,
        activePlan,
        recommendations,
        daysToExam
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ message: "Failed to load dashboard data" });
    }
  });

  // User routes
  app.get("/api/user/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Subject routes
  app.get("/api/subjects", async (req, res) => {
    try {
      const subjects = await storage.getAllSubjects();
      res.json(subjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subjects" });
    }
  });

  // Questions routes
  app.get("/api/questions/subject/:subjectId", async (req, res) => {
    try {
      const subjectId = parseInt(req.params.subjectId);
      const limit = parseInt(req.query.limit as string) || 20;
      
      const questions = await storage.getQuestionsBySubject(subjectId, limit);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.get("/api/questions/adaptive", async (req, res) => {
    try {
      const { userId, subjectId, difficulty, count } = req.query;
      
      const questions = await questionGenerator.getAdaptiveQuestions({
        userId: parseInt(userId as string),
        subjectId: parseInt(subjectId as string),
        difficulty: difficulty ? parseInt(difficulty as string) : undefined,
        count: count ? parseInt(count as string) : undefined,
        excludeAnswered: true
      });
      
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get adaptive questions" });
    }
  });

  app.get("/api/questions/mixed/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const count = parseInt(req.query.count as string) || 20;
      
      const questions = await questionGenerator.getMixedTopicQuestions(userId, count);
      res.json(questions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get mixed questions" });
    }
  });

  // Question explanation route (AI-powered)
  app.post("/api/questions/:id/explanation", async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const question = await storage.getQuestion(questionId);
      
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const subject = await storage.getSubject(question.subjectId);
      const options = question.options.map((opt: any) => opt.text);
      const correctOption = question.options.find((opt: any) => opt.id === question.correctAnswer);
      
      const explanation = await generateQuestionExplanation(
        question.content,
        options,
        correctOption?.text || "Unknown",
        subject?.name || "Unknown"
      );
      
      res.json(explanation);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate explanation" });
    }
  });

  // Practice session routes
  app.post("/api/practice/start", async (req, res) => {
    try {
      const validatedData = insertPracticeSessionSchema.parse(req.body);
      const session = await storage.createPracticeSession(validatedData);
      res.json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create practice session" });
    }
  });

  app.post("/api/practice/:sessionId/answer", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const validatedData = insertUserAnswerSchema.parse({
        ...req.body,
        sessionId
      });
      
      const answer = await storage.createUserAnswer(validatedData);
      res.json(answer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid answer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save answer" });
    }
  });

  app.put("/api/practice/:sessionId/complete", async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const { questionsAttempted, correctAnswers, totalTime, score } = req.body;
      
      const session = await storage.updatePracticeSession(sessionId, {
        questionsAttempted,
        correctAnswers,
        totalTime,
        score,
        completed: true
      });
      
      // Update user progress with AI insights
      if (session.subjectId) {
        await adaptiveLearningService.updateUserProgressAfterSession(
          session.userId, 
          session.subjectId, 
          questionsAttempted, 
          correctAnswers, 
          totalTime
        );
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  app.get("/api/practice/sessions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 10;
      
      const sessions = await storage.getUserPracticeSessions(userId, limit);
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get practice sessions" });
    }
  });

  // User progress routes
  app.get("/api/progress/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progress = await storage.getUserProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user progress" });
    }
  });

  app.get("/api/progress/:userId/subject/:subjectId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const subjectId = parseInt(req.params.subjectId);
      
      const progress = await storage.getUserSubjectProgress(userId, subjectId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get subject progress" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const analytics = await adaptiveLearningService.generateUserAnalytics(userId);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate analytics" });
    }
  });

  // AI Recommendations routes
  app.get("/api/recommendations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const recommendations = await storage.getUserAIRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recommendations" });
    }
  });

  app.post("/api/recommendations/:userId/generate", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const recommendations = await adaptiveLearningService.generateAIRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI recommendations" });
    }
  });

  // Study plan routes
  app.get("/api/study-plans/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const plans = await storage.getUserStudyPlans(userId);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get study plans" });
    }
  });

  app.get("/api/study-plans/:userId/active", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const activePlan = await storage.getActiveStudyPlan(userId);
      res.json(activePlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active study plan" });
    }
  });

  app.post("/api/study-plans/generate", async (req, res) => {
    try {
      const { userId, goals, currentLevel, timeAvailable } = req.body;
      
      const aiPlan = await generateStudyPlan(goals, currentLevel, timeAvailable);
      
      if (aiPlan) {
        const validatedPlan = insertStudyPlanSchema.parse({
          userId: parseInt(userId),
          title: aiPlan.title || "AI-Generated Study Plan",
          description: aiPlan.description || "Personalized study plan created by AI",
          dailyGoal: aiPlan.dailyGoal || 120,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
          isActive: true
        });
        
        const plan = await storage.createStudyPlan(validatedPlan);
        res.json(plan);
      } else {
        res.status(500).json({ message: "Failed to generate AI study plan" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid study plan data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create study plan" });
    }
  });

  const server = createServer(app);
  return server;
  }
