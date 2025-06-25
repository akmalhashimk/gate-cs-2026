import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import QuestionInterface from "@/components/QuestionInterface";
import { Timer, Brain, BookOpen, BarChart3 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const CURRENT_USER_ID = 1;

export default function Practice() {
  const [, params] = useRoute("/practice/:subjectId");
  const subjectId = params?.subjectId ? parseInt(params.subjectId) : null;
  const [practiceMode, setPracticeMode] = useState<'subject' | 'adaptive' | 'mixed'>('subject');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const { toast } = useToast();

  // Get subjects for selection
  const { data: subjects } = useQuery({
    queryKey: ['/api/subjects'],
  });

  // Get adaptive questions with AI-powered selection
  const { data: adaptiveQuestions } = useQuery({
    queryKey: [`/api/questions/adaptive?userId=${CURRENT_USER_ID}&subjectId=${subjectId}&count=20`],
    enabled: !!subjectId && practiceMode === 'adaptive',
  });

  // Start practice session mutation
  const startSessionMutation = useMutation({
    mutationFn: async (sessionData: any) => {
      const response = await apiRequest('POST', '/api/practice/start', sessionData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentSession(data);
      setIsSessionActive(true);
      toast({
        title: "Practice Session Started",
        description: "AI has selected questions based on your performance!",
      });
    },
  });

  const handleStartPractice = (mode: 'subject' | 'adaptive' | 'mixed') => {
    const sessionData = {
      userId: CURRENT_USER_ID,
      subjectId: mode === 'mixed' ? null : subjectId,
      type: mode,
      questionsAttempted: 0,
      correctAnswers: 0,
      totalTime: 0,
      score: 0,
      completed: false,
    };

    startSessionMutation.mutate(sessionData);
  };

  if (isSessionActive && currentSession) {
    const questions = practiceMode === 'adaptive' ? adaptiveQuestions : 
                    practiceMode === 'mixed' ? mixedQuestions : subjectQuestions;
    
    return (
      <QuestionInterface
        session={currentSession}
        questions={questions || []}
        onComplete={(sessionData) => {
          setIsSessionActive(false);
          setCurrentSession(null);
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-custom mb-2">Practice Center</h1>
        <p className="text-secondary-custom">Choose your practice mode and start preparing for GATE CS 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Subject-Specific Practice */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <BookOpen className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Subject Practice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-custom mb-4">
              Focus on specific GATE CSE subjects
            </p>
            <Button 
              onClick={() => handleStartPractice('subject')}
              className="w-full"
              disabled={!subjectId}
            >
              Start Practice
            </Button>
          </CardContent>
        </Card>

        {/* AI-Adaptive Practice */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-primary">
          <CardHeader>
            <Brain className="h-8 w-8 text-primary mb-2" />
            <CardTitle>AI Adaptive</CardTitle>
            <Badge variant="secondary">Recommended</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-custom mb-4">
              AI-curated questions based on your performance
            </p>
            <Button 
              onClick={() => handleStartPractice('adaptive')}
              className="w-full"
              disabled={!subjectId}
            >
              Start AI Practice
            </Button>
          </CardContent>
        </Card>

        {/* Mixed Topics Practice */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardHeader>
            <BarChart3 className="h-8 w-8 text-primary mb-2" />
            <CardTitle>Mixed Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-secondary-custom mb-4">
              Comprehensive practice across all subjects
            </p>
            <Button 
              onClick={() => handleStartPractice('mixed')}
              className="w-full"
            >
              Start Mixed Practice
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
        }
