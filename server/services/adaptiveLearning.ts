import { storage } from "../storage";
import { generateStudyRecommendations } from "./openai";
import { type UserProgress, type AIRecommendation } from "@shared/schema";

export interface LearningAnalytics {
  overallAccuracy: number;
  totalQuestionsSolved: number;
  studyStreak: number;
  weeklyProgress: number;
  strongSubjects: string[];
  weakSubjects: string[];
  recommendedStudyTime: number;
}

export class AdaptiveLearningService {
  async generateUserAnalytics(userId: number): Promise<LearningAnalytics> {
    const userProgress = await storage.getUserProgress(userId);
    const recentSessions = await storage.getUserPracticeSessions(userId, 30);
    const subjects = await storage.getAllSubjects();
    
    // Calculate overall metrics
    const totalQuestions = userProgress.reduce((sum, p) => sum + p.totalQuestions, 0);
    const totalCorrect = userProgress.reduce((sum, p) => sum + p.correctAnswers, 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
    
    // Calculate study streak using AI-powered insights
    const studyStreak = this.calculateStudyStreak(recentSessions);
    const weeklyProgress = this.calculateWeeklyProgress(recentSessions);
    
    // AI-powered subject analysis
    const subjectPerformance = userProgress.map(p => {
      const subject = subjects.find(s => s.id === p.subjectId);
      const accuracy = p.totalQuestions > 0 ? (p.correctAnswers / p.totalQuestions) * 100 : 0;
      return {
        subjectName: subject?.name || 'Unknown',
        accuracy,
        strengthLevel: p.strengthLevel
      };
    });
    
    const strongSubjects = subjectPerformance
      .filter(s => s.accuracy >= 80)
      .map(s => s.subjectName);
    
    const weakSubjects = subjectPerformance
      .filter(s => s.accuracy < 60)
      .map(s => s.subjectName);
    
    const recommendedStudyTime = this.calculateRecommendedStudyTime(userProgress, recentSessions);
    
    return {
      overallAccuracy,
      totalQuestionsSolved: totalQuestions,
      studyStreak,
      weeklyProgress,
      strongSubjects,
      weakSubjects,
      recommendedStudyTime
    };
  }

  private calculateStudyStreak(sessions: any[]): number {
    if (sessions.length === 0) return 0;
    
    const sortedSessions = sessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.createdAt);
      sessionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }
    
    return streak;
  }

  private calculateWeeklyProgress(sessions: any[]): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const weeklySessions = sessions.filter(s => 
      new Date(s.createdAt) >= oneWeekAgo
    );
    
    return weeklySessions.length;
  }

  private calculateRecommendedStudyTime(userProgress: UserProgress[], sessions: any[]): number {
    // AI-powered recommendation based on performance
    const averageAccuracy = userProgress.length > 0 
      ? userProgress.reduce((sum, p) => {
          const accuracy = p.totalQuestions > 0 ? (p.correctAnswers / p.totalQuestions) * 100 : 0;
          return sum + accuracy;
        }, 0) / userProgress.length
      : 0;
    
    // Recommend more time for lower accuracy
    if (averageAccuracy < 50) return 180; // 3 hours
    if (averageAccuracy < 70) return 120; // 2 hours
    if (averageAccuracy < 85) return 90;  // 1.5 hours
    return 60; // 1 hour for high performers
  }

  async updateUserProgressAfterSession(
    userId: number,
    subjectId: number,
    questionsAttempted: number,
    correctAnswers: number,
    totalTime: number
  ): Promise<void> {
    const existingProgress = await storage.getUserSubjectProgress(userId, subjectId);
    const averageTimePerQuestion = questionsAttempted > 0 ? totalTime / questionsAttempted : 0;
    
    if (existingProgress) {
      const newTotalQuestions = existingProgress.totalQuestions + questionsAttempted;
      const newCorrectAnswers = existingProgress.correctAnswers + correctAnswers;
      const newAverageTime = Math.round(
        ((existingProgress.averageTime * existingProgress.totalQuestions) + totalTime) / newTotalQuestions
      );
      
      // AI-powered strength level calculation
      const accuracy = newTotalQuestions > 0 ? (newCorrectAnswers / newTotalQuestions) * 100 : 0;
      const strengthLevel = Math.min(5, Math.max(1, Math.ceil(accuracy / 20)));
      
      await storage.updateUserProgress(userId, subjectId, {
        totalQuestions: newTotalQuestions,
        correctAnswers: newCorrectAnswers,
        averageTime: newAverageTime,
        strengthLevel,
        lastPracticed: new Date(),
      });
    }
  }

  async generateAIRecommendations(userId: number): Promise<AIRecommendation[]> {
    const userProgress = await storage.getUserProgress(userId);
    const recentSessions = await storage.getUserPracticeSessions(userId, 10);
    
    try {
      const recommendations = await generateStudyRecommendations(userProgress, recentSessions);
      
      // Store recommendations in database
      const savedRecommendations: AIRecommendation[] = [];
      for (const rec of recommendations) {
        const saved = await storage.createAIRecommendation({
          userId,
          type: rec.type,
          subjectId: 1, // Default subject, should be mapped properly
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          actionUrl: rec.actionUrl,
        });
        savedRecommendations.push(saved);
      }
      
      return savedRecommendations;
    } catch (error) {
      console.error("Error generating AI recommendations:", error);
      return [];
    }
  }
}

export const adaptiveLearningService = new AdaptiveLearningService();
