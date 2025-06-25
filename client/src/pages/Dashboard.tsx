import { useQuery } from "@tanstack/react-query";
import QuickStats from "@/components/QuickStats";
import AIRecommendations from "@/components/AIRecommendations";
import QuickPractice from "@/components/QuickPractice";
import RecentActivity from "@/components/RecentActivity";
import StudyPlanSidebar from "@/components/StudyPlanSidebar";
import PerformanceChart from "@/components/PerformanceChart";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useLocation } from "wouter";

const CURRENT_USER_ID = 1;

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/dashboard/${CURRENT_USER_ID}`],
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary-custom mb-2">
              Welcome back, {dashboardData.user?.firstName || 'Student'}!
            </h1>
            <p className="text-secondary-custom">Continue your AI-powered GATE CSE 2026 preparation</p>
          </div>
          <div className="mt-4 lg:mt-0 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl p-4 text-center">
            <p className="text-sm opacity-90">Exam in</p>
            <p className="text-2xl font-bold">{dashboardData.daysToExam} days</p>
          </div>
        </div>
        
        <QuickStats analytics={dashboardData.analytics} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          <AIRecommendations recommendations={dashboardData.recommendations} />
          <QuickPractice subjectProgress={dashboardData.subjectProgress} />
          <RecentActivity sessions={dashboardData.recentSessions} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <StudyPlanSidebar activePlan={dashboardData.activePlan} />
          <PerformanceChart sessions={dashboardData.recentSessions} />
          
          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-primary-custom mb-4">Quick Actions</h2>
            
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation('/practice')}
                className="w-full justify-start"
                variant="outline"
              >
                <Play className="h-4 w-4 mr-2" />
                Start AI Practice
              </Button>
              
              <Button 
                onClick={() => setLocation('/analytics')}
                className="w-full justify-start"
                variant="outline"
              >
                View Analytics
              </Button>
              
              <Button 
                onClick={() => setLocation('/study-plan')}
                className="w-full justify-start"
                variant="outline"
              >
                Study Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
    }
