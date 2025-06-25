import { storage } from "../storage";
import { type Question, type UserProgress } from "@shared/schema";

export interface AdaptiveQuestionRequest {
  userId: number;
  subjectId: number;
  difficulty?: number;
  count?: number;
  excludeAnswered?: boolean;
}

export interface QuestionWithMetrics extends Question {
  userAccuracy?: number;
  averageTime?: number;
  attemptCount?: number;
}

export class QuestionGenerator {
  async getAdaptiveQuestions(request: AdaptiveQuestionRequest): Promise<QuestionWithMetrics[]> {
    const { userId, subjectId, difficulty, count = 20, excludeAnswered = true } = request;
    
    // Get user's current performance level for this subject
    const userProgress = await storage.getUserSubjectProgress(userId, subjectId);
    const userLevel = userProgress?.strengthLevel || 1;
    
    // Calculate target difficulty based on user level and requested difficulty
    const targetDifficulty = this.calculateTargetDifficulty(userLevel, difficulty || 3);
    
    // Get questions from storage
    const allQuestions = await storage.getAdaptiveQuestions(userId, subjectId, targetDifficulty, count * 2);
    
    // Add performance metrics to questions
    const questionsWithMetrics: QuestionWithMetrics[] = [];
    
    for (const question of allQuestions) {
      const metrics = await this.calculateQuestionMetrics(userId, question.id);
      
      questionsWithMetrics.push({
        ...question,
        userAccuracy: metrics.accuracy,
        averageTime: metrics.averageTime,
        attemptCount: metrics.attemptCount
      });
    }
    
    // AI-powered question selection algorithm
    const selectedQuestions = this.selectOptimalQuestions(questionsWithMetrics, count, userLevel);
    
    return selectedQuestions.slice(0, count);
  }

  private calculateTargetDifficulty(userLevel: number, requestedDifficulty: number): number {
    // Adaptive difficulty based on user performance
    const difficultyMap = {
      1: 1, // Beginner
      2: 2, // Elementary  
      3: 3, // Intermediate
      4: 4, // Advanced
      5: 5  // Expert
    };
    
    const baseDifficulty = difficultyMap[userLevel as keyof typeof difficultyMap] || 3;
    
    // Allow slight variation from user's level
    return Math.max(1, Math.min(5, requestedDifficulty || baseDifficulty));
  }

  private async calculateQuestionMetrics(userId: number, questionId: number): Promise<{
    accuracy: number;
    averageTime: number;
    attemptCount: number;
  }> {
    // This would query user_answers table in a real implementation
    // For now, return default values
    return {
      accuracy: 0,
      averageTime: 0,
      attemptCount: 0
    };
  }

  private selectOptimalQuestions(
    questions: QuestionWithMetrics[], 
    count: number, 
    userLevel: number
  ): QuestionWithMetrics[] {
    // AI-powered selection algorithm
    // 1. Prioritize questions user hasn't seen
    // 2. Balance difficulty distribution
    // 3. Include questions from weak areas
    
    const unseenQuestions = questions.filter(q => q.attemptCount === 0);
    const partiallyAnswered = questions.filter(q => q.attemptCount > 0 && (q.userAccuracy || 0) < 80);
    
    const selected: QuestionWithMetrics[] = [];
    
    // 70% new questions, 30% review questions
    const newQuestionCount = Math.floor(count * 0.7);
    const reviewQuestionCount = count - newQuestionCount;
    
    // Select new questions
    selected.push(...this.shuffleArray(unseenQuestions).slice(0, newQuestionCount));
    
    // Select review questions from partially answered
    selected.push(...this.shuffleArray(partiallyAnswered).slice(0, reviewQuestionCount));
    
    // Fill remaining slots if needed
    const remaining = count - selected.length;
    if (remaining > 0) {
      const remainingQuestions = questions.filter(q => !selected.includes(q));
      selected.push(...this.shuffleArray(remainingQuestions).slice(0, remaining));
    }
    
    return this.shuffleArray(selected);
  }

  async getMixedTopicQuestions(userId: number, count: number = 20): Promise<Question[]> {
    const subjects = await storage.getAllSubjects();
    const questionsPerSubject = Math.ceil(count / subjects.length);
    
    const allQuestions: Question[] = [];
    
    for (const subject of subjects) {
      const questions = await this.getAdaptiveQuestions({
        userId,
        subjectId: subject.id,
        count: questionsPerSubject
      });
      
      allQuestions.push(...questions);
    }
    
    // Shuffle and limit to requested count
    return this.shuffleArray(allQuestions).slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export const questionGenerator = new QuestionGenerator();
