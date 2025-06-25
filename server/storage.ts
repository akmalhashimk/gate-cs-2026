import {
  users, subjects, questions, practiceSessions, userAnswers, userProgress,
  studyPlans, studyPlanTasks, aiRecommendations,
  type User, type InsertUser, type Subject, type InsertSubject,
  type Question, type InsertQuestion, type PracticeSession, type InsertPracticeSession,
  type UserAnswer, type InsertUserAnswer, type UserProgress, type InsertUserProgress,
  type StudyPlan, type InsertStudyPlan, type StudyPlanTask, type InsertStudyPlanTask,
  type AIRecommendation, type InsertAIRecommendation
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Subject operations
  getAllSubjects(): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;

  // Question operations
  getQuestionsBySubject(subjectId: number, limit?: number): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  getAdaptiveQuestions(userId: number, subjectId: number, difficulty: number, limit: number): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;

  // Practice session operations
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  getPracticeSession(id: number): Promise<PracticeSession | undefined>;
  updatePracticeSession(id: number, session: Partial<PracticeSession>): Promise<PracticeSession>;
  getUserPracticeSessions(userId: number, limit?: number): Promise<PracticeSession[]>;

  // User answer operations
  createUserAnswer(answer: InsertUserAnswer): Promise<UserAnswer>;
  getSessionAnswers(sessionId: number): Promise<UserAnswer[]>;

  // User progress operations
  getUserProgress(userId: number): Promise<UserProgress[]>;
  getUserSubjectProgress(userId: number, subjectId: number): Promise<UserProgress | undefined>;
  updateUserProgress(userId: number, subjectId: number, progress: Partial<UserProgress>): Promise<UserProgress>;

  // Study plan operations
  getUserStudyPlans(userId: number): Promise<StudyPlan[]>;
  getActiveStudyPlan(userId: number): Promise<StudyPlan | undefined>;
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  getStudyPlanTasks(planId: number): Promise<StudyPlanTask[]>;
  createStudyPlanTask(task: InsertStudyPlanTask): Promise<StudyPlanTask>;
  updateStudyPlanTask(id: number, task: Partial<StudyPlanTask>): Promise<StudyPlanTask>;

  // AI recommendations operations
  getUserAIRecommendations(userId: number): Promise<AIRecommendation[]>;
  createAIRecommendation(recommendation: InsertAIRecommendation): Promise<AIRecommendation>;
  updateAIRecommendation(id: number, recommendation: Partial<AIRecommendation>): Promise<AIRecommendation>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subjects: Map<number, Subject>;
  private questions: Map<number, Question>;
  private practiceSessionsMap: Map<number, PracticeSession>;
  private userAnswersMap: Map<number, UserAnswer>;
  private userProgressMap: Map<number, UserProgress>;
  private studyPlansMap: Map<number, StudyPlan>;
  private studyPlanTasksMap: Map<number, StudyPlanTask>;
  private aiRecommendationsMap: Map<number, AIRecommendation>;
  
  private currentUserId: number;
  private currentSubjectId: number;
  private currentQuestionId: number;
  private currentSessionId: number;
  private currentAnswerId: number;
  private currentProgressId: number;
  private currentPlanId: number;
  private currentTaskId: number;
  private currentRecommendationId: number;

  constructor() {
    this.users = new Map();
    this.subjects = new Map();
    this.questions = new Map();
    this.practiceSessionsMap = new Map();
    this.userAnswersMap = new Map();
    this.userProgressMap = new Map();
    this.studyPlansMap = new Map();
    this.studyPlanTasksMap = new Map();
    this.aiRecommendationsMap = new Map();
    
    this.currentUserId = 1;
    this.currentSubjectId = 1;
    this.currentQuestionId = 1;
    this.currentSessionId = 1;
    this.currentAnswerId = 1;
    this.currentProgressId = 1;
    this.currentPlanId = 1;
    this.currentTaskId = 1;
    this.currentRecommendationId = 1;

    this.initializeData();
  }

  private initializeData() {
    // Create sample user
    const sampleUser: User = {
      id: 1,
      username: "student",
      email: "student@example.com",
      password: "hashed_password",
      firstName: "John",
      lastName: "Doe",
      createdAt: new Date(),
    };
    this.users.set(1, sampleUser);

    // Create GATE CSE subjects
    const subjects: Subject[] = [
      { id: 1, name: "Algorithms", code: "ALGO", description: "Data Structures and Algorithms", icon: "🔢", color: "#6366f1" },
      { id: 2, name: "Database Management", code: "DBMS", description: "Database Systems and SQL", icon: "🗄️", color: "#059669" },
      { id: 3, name: "Computer Networks", code: "CN", description: "Network Protocols and Security", icon: "🌐", color: "#dc2626" },
      { id: 4, name: "Operating Systems", code: "OS", description: "System Programming and Processes", icon: "💻", color: "#7c3aed" },
      { id: 5, name: "Computer Organization", code: "COA", description: "Computer Architecture", icon: "🔧", color: "#ea580c" },
      { id: 6, name: "Theory of Computation", code: "TOC", description: "Automata and Formal Languages", icon: "📐", color: "#0891b2" },
    ];

    subjects.forEach(subject => {
      this.subjects.set(subject.id, subject);
      this.currentSubjectId = Math.max(this.currentSubjectId, subject.id + 1);
    });

    // Initialize sample questions
    this.initializeQuestions();

    // Create sample user progress
    subjects.forEach(subject => {
      const progress: UserProgress = {
        id: this.currentProgressId++,
        userId: 1,
        subjectId: subject.id,
        totalQuestions: Math.floor(Math.random() * 50) + 10,
        correctAnswers: Math.floor(Math.random() * 30) + 5,
        averageTime: Math.floor(Math.random() * 120) + 30,
        strengthLevel: Math.floor(Math.random() * 3) + 2,
        lastPracticed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      };
      this.userProgressMap.set(progress.id, progress);
    });

    // Create sample AI recommendations
    const recommendations: AIRecommendation[] = [
      {
        id: 1,
        userId: 1,
        type: "focus_area",
        subjectId: 3,
        title: "Focus on Network Security",
        description: "Your performance in network security topics needs improvement. Practice more questions on encryption and authentication.",
        priority: 3,
        actionUrl: "/practice/3",
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        type: "strength",
        subjectId: 1,
        title: "Excellent Algorithm Skills",
        description: "You're performing exceptionally well in algorithms. Consider tackling more advanced problems.",
        priority: 1,
        actionUrl: "/practice/1",
        createdAt: new Date(),
      },
    ];

    recommendations.forEach(rec => {
      this.aiRecommendationsMap.set(rec.id, rec);
      this.currentRecommendationId = Math.max(this.currentRecommendationId, rec.id + 1);
    });
  }

  private initializeQuestions() {
    const sampleQuestions: Question[] = [
      {
        id: 1,
        subjectId: 1,
        title: "Time Complexity",
        content: "What is the time complexity of the merge sort algorithm?",
        options: [
          { id: 1, text: "O(n)" },
          { id: 2, text: "O(n log n)" },
          { id: 3, text: "O(n²)" },
          { id: 4, text: "O(log n)" }
        ],
        correctAnswer: 2,
        explanation: "Merge sort divides the array into halves recursively and merges them, resulting in O(n log n) time complexity.",
        difficulty: 2,
        tags: ["algorithms", "sorting", "time-complexity"],
        createdAt: new Date(),
      },
      {
        id: 2,
        subjectId: 2,
        title: "Database Normalization",
        content: "Which normal form eliminates transitive dependencies?",
        options: [
          { id: 1, text: "1NF" },
          { id: 2, text: "2NF" },
          { id: 3, text: "3NF" },
          { id: 4, text: "BCNF" }
        ],
        correctAnswer: 3,
        explanation: "Third Normal Form (3NF) eliminates transitive dependencies where non-key attributes depend on other non-key attributes.",
        difficulty: 3,
        tags: ["database", "normalization", "3nf"],
        createdAt: new Date(),
      },
      {
        id: 3,
        subjectId: 3,
        title: "OSI Model",
        content: "Which layer of the OSI model handles routing?",
        options: [
          { id: 1, text: "Data Link Layer" },
          { id: 2, text: "Network Layer" },
          { id: 3, text: "Transport Layer" },
          { id: 4, text: "Session Layer" }
        ],
        correctAnswer: 2,
        explanation: "The Network Layer (Layer 3) is responsible for routing packets between different networks using IP addresses.",
        difficulty: 2,
        tags: ["networking", "osi-model", "routing"],
        createdAt: new Date(),
      },
      {
        id: 4,
        subjectId: 4,
        title: "Process Scheduling",
        content: "Which scheduling algorithm can cause starvation?",
        options: [
          { id: 1, text: "First Come First Serve (FCFS)" },
          { id: 2, text: "Shortest Job First (SJF)" },
          { id: 3, text: "Round Robin (RR)" },
          { id: 4, text: "Priority Scheduling" }
        ],
        correctAnswer: 4,
        explanation: "Priority Scheduling can cause starvation where low-priority processes may never get executed if high-priority processes keep arriving.",
        difficulty: 3,
        tags: ["operating-systems", "scheduling", "starvation"],
        createdAt: new Date(),
      },
      {
        id: 5,
        subjectId: 4,
        title: "Process Scheduling",
        content: "In which scheduling algorithm can starvation occur?",
        options: [
          { id: 1, text: "Round Robin" },
          { id: 2, text: "FCFS" },
          { id: 3, text: "Priority Scheduling" },
          { id: 4, text: "SJF with aging" }
        ],
        correctAnswer: 3,
        explanation: "Priority Scheduling can lead to starvation where low-priority processes may never execute if high-priority processes continuously arrive.",
        difficulty: 3,
        tags: ["operating-systems", "scheduling"],
        createdAt: new Date(),
      },
    ];

    sampleQuestions.forEach(question => {
      this.questions.set(question.id, question);
      this.currentQuestionId = Math.max(this.currentQuestionId, question.id + 1);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Subject operations
  async getAllSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    return this.subjects.get(id);
  }

  async createSubject(insertSubject: InsertSubject): Promise<Subject> {
    const id = this.currentSubjectId++;
    const subject: Subject = { ...insertSubject, id };
    this.subjects.set(id, subject);
    return subject;
  }

  // Question operations
  async getQuestionsBySubject(subjectId: number, limit = 20): Promise<Question[]> {
    const questions = Array.from(this.questions.values())
      .filter(q => q.subjectId === subjectId)
      .slice(0, limit);
    return questions;
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async getAdaptiveQuestions(userId: number, subjectId: number, difficulty: number, limit: number): Promise<Question[]> {
    const questions = Array.from(this.questions.values())
      .filter(q => q.subjectId === subjectId && Math.abs(q.difficulty - difficulty) <= 1)
      .slice(0, limit);
    return questions;
  }

  async createQuestion(insertQuestion: InsertQuestion): Promise<Question> {
    const id = this.currentQuestionId++;
    const question: Question = { 
      ...insertQuestion, 
      id, 
      createdAt: new Date() 
    };
    this.questions.set(id, question);
    return question;
  }

  // Practice session operations
  async createPracticeSession(insertSession: InsertPracticeSession): Promise<PracticeSession> {
    const id = this.currentSessionId++;
    const session: PracticeSession = { 
      ...insertSession, 
      id, 
      createdAt: new Date() 
    };
    this.practiceSessionsMap.set(id, session);
    return session;
  }

  async getPracticeSession(id: number): Promise<PracticeSession | undefined> {
    return this.practiceSessionsMap.get(id);
  }

  async updatePracticeSession(id: number, updates: Partial<PracticeSession>): Promise<PracticeSession> {
    const session = this.practiceSessionsMap.get(id);
    if (!session) {
      throw new Error("Practice session not found");
    }
    const updatedSession = { ...session, ...updates };
    this.practiceSessionsMap.set(id, updatedSession);
    return updatedSession;
  }

  async getUserPracticeSessions(userId: number, limit = 10): Promise<PracticeSession[]> {
    return Array.from(this.practiceSessionsMap.values())
      .filter(session => session.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  // User answer operations
  async createUserAnswer(insertAnswer: InsertUserAnswer): Promise<UserAnswer> {
    const id = this.currentAnswerId++;
    const answer: UserAnswer = { 
      ...insertAnswer, 
      id, 
      createdAt: new Date() 
    };
    this.userAnswersMap.set(id, answer);
    return answer;
  }

  async getSessionAnswers(sessionId: number): Promise<UserAnswer[]> {
    return Array.from(this.userAnswersMap.values())
      .filter(answer => answer.sessionId === sessionId);
  }

  // User progress operations
  async getUserProgress(userId: number): Promise<UserProgress[]> {
    return Array.from(this.userProgressMap.values())
      .filter(progress => progress.userId === userId);
  }

  async getUserSubjectProgress(userId: number, subjectId: number): Promise<UserProgress | undefined> {
    return Array.from(this.userProgressMap.values())
      .find(progress => progress.userId === userId && progress.subjectId === subjectId);
  }

  async updateUserProgress(userId: number, subjectId: number, updates: Partial<UserProgress>): Promise<UserProgress> {
    const existing = await this.getUserSubjectProgress(userId, subjectId);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.userProgressMap.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentProgressId++;
      const newProgress: UserProgress = {
        id,
        userId,
        subjectId,
        totalQuestions: 0,
        correctAnswers: 0,
        averageTime: 0,
        strengthLevel: 1,
        lastPracticed: null,
        ...updates
      };
      this.userProgressMap.set(id, newProgress);
      return newProgress;
    }
  }

  // Study plan operations
  async getUserStudyPlans(userId: number): Promise<StudyPlan[]> {
    return Array.from(this.studyPlansMap.values())
      .filter(plan => plan.userId === userId);
  }

  async getActiveStudyPlan(userId: number): Promise<StudyPlan | undefined> {
    return Array.from(this.studyPlansMap.values())
      .find(plan => plan.userId === userId && plan.isActive);
  }

  async createStudyPlan(insertPlan: InsertStudyPlan): Promise<StudyPlan> {
    const id = this.currentPlanId++;
    const plan: StudyPlan = { 
      ...insertPlan, 
      id, 
      createdAt: new Date() 
    };
    this.studyPlansMap.set(id, plan);
    return plan;
  }

  async getStudyPlanTasks(planId: number): Promise<StudyPlanTask[]> {
    return Array.from(this.studyPlanTasksMap.values())
      .filter(task => task.planId === planId);
  }

  async createStudyPlanTask(insertTask: InsertStudyPlanTask): Promise<StudyPlanTask> {
    const id = this.currentTaskId++;
    const task: StudyPlanTask = { ...insertTask, id };
    this.studyPlanTasksMap.set(id, task);
    return task;
  }

  async updateStudyPlanTask(id: number, updates: Partial<StudyPlanTask>): Promise<StudyPlanTask> {
    const task = this.studyPlanTasksMap.get(id);
    if (!task) {
      throw new Error("Study plan task not found");
    }
    const updatedTask = { ...task, ...updates };
    this.studyPlanTasksMap.set(id, updatedTask);
    return updatedTask;
  }

  // AI recommendations operations
  async getUserAIRecommendations(userId: number): Promise<AIRecommendation[]> {
    return Array.from(this.aiRecommendationsMap.values())
      .filter(rec => rec.userId === userId)
      .sort((a, b) => b.priority - a.priority);
  }

  async createAIRecommendation(insertRecommendation: InsertAIRecommendation): Promise<AIRecommendation> {
    const id = this.currentRecommendationId++;
    const recommendation: AIRecommendation = { 
      ...insertRecommendation, 
      id, 
      createdAt: new Date() 
    };
    this.aiRecommendationsMap.set(id, recommendation);
    return recommendation;
  }

  async updateAIRecommendation(id: number, updates: Partial<AIRecommendation>): Promise<AIRecommendation> {
    const recommendation = this.aiRecommendationsMap.get(id);
    if (!recommendation) {
      throw new Error("AI recommendation not found");
    }
    const updated = { ...recommendation, ...updates };
    this.aiRecommendationsMap.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
