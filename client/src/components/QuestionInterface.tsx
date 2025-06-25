import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Timer, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  CheckCircle, 
  XCircle,
  Clock,
  HelpCircle,
  Brain
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Question {
  id: number;
  title: string;
  content: string;
  options: Array<{ id: number; text: string }>;
  correctAnswer: number;
  explanation: string;
  difficulty: number;
  tags?: string[];
}

interface QuestionInterfaceProps {
  session: any;
  questions: Question[];
  onComplete: (sessionData: any) => void;
}

interface UserAnswer {
  questionId: number;
  selectedAnswer: number;
  timeSpent: number;
  isCorrect: boolean;
}

export default function QuestionInterface({ session, questions, onComplete }: QuestionInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const { toast } = useToast();

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const currentAnswer = userAnswers.find(a => a.questionId === currentQuestion?.id);

  // Get AI-generated explanation
  const getExplanationMutation = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await apiRequest('POST', `/api/questions/${questionId}/explanation`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setExplanation(data.explanation || 'AI explanation not available.');
      setIsLoadingExplanation(false);
    },
  });

  const handleOptionSelect = (optionId: number) => {
    setSelectedOption(optionId);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    
    const newAnswer: UserAnswer = {
      questionId: currentQuestion.id,
      selectedAnswer: selectedOption,
      timeSpent,
      isCorrect
    };

    setUserAnswers(prev => [...prev.filter(a => a.questionId !== currentQuestion.id), newAnswer]);
    
    toast({
      title: isCorrect ? "Correct!" : "Incorrect",
      description: isCorrect ? "Well done!" : "Don't worry, keep practicing!",
      variant: isCorrect ? "default" : "destructive",
    });

    // Auto-advance to next question
    setTimeout(() => {
      if (isLastQuestion) {
        handleCompleteSession();
      } else {
        handleNextQuestion();
      }
    }, 1500);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setQuestionStartTime(Date.now());
      setShowExplanation(false);
      setExplanation('');
    }
  };

  const handleGetExplanation = () => {
    setIsLoadingExplanation(true);
    setShowExplanation(true);
    getExplanationMutation.mutate(currentQuestion.id);
  };

  const handleCompleteSession = () => {
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const totalTime = userAnswers.reduce((sum, a) => sum + a.timeSpent, 0);
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const sessionData = {
      ...session,
      questionsAttempted: totalQuestions,
      correctAnswers,
      totalTime,
      score,
      completed: true
    };

    onComplete(sessionData);
  };

  if (!currentQuestion) {
    return <div>Loading questions...</div>;
  }

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Badge variant="outline">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </Badge>
            <Badge variant={currentQuestion.difficulty <= 2 ? "secondary" : 
                           currentQuestion.difficulty <= 4 ? "default" : "destructive"}>
              {currentQuestion.difficulty <= 2 ? "Easy" : 
               currentQuestion.difficulty <= 4 ? "Medium" : "Hard"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetExplanation}
            disabled={isLoadingExplanation}
          >
            <Brain className="h-4 w-4 mr-1" />
            AI Explanation
          </Button>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.content}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <div
                key={option.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedOption === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                } ${
                  currentAnswer && currentAnswer.selectedAnswer === option.id
                    ? currentAnswer.isCorrect
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : ''
                }`}
                onClick={() => !currentAnswer && handleOptionSelect(option.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedOption === option.id ? 'border-primary bg-primary' : 'border-gray-300'
                  }`} />
                  <span className="text-sm">{option.text}</span>
                  {currentAnswer && currentAnswer.selectedAnswer === option.id && (
                    currentAnswer.isCorrect ? 
                      <CheckCircle className="h-4 w-4 text-green-500 ml-auto" /> :
                      <XCircle className="h-4 w-4 text-red-500 ml-auto" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {!currentAnswer ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className="bg-primary hover:bg-primary/90"
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                onClick={isLastQuestion ? handleCompleteSession : handleNextQuestion}
                className="bg-primary hover:bg-primary/90"
              >
                {isLastQuestion ? 'Complete Session' : 'Next Question'}
                {!isLastQuestion && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Explanation */}
      {showExplanation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Brain className="h-5 w-5 mr-2 text-blue-600" />
              AI-Generated Explanation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingExplanation ? (
              <div className="animate-pulse">
                <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-blue-200 rounded w-1/2"></div>
              </div>
            ) : (
              <p className="text-sm text-blue-800">{explanation}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
        }
