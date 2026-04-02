import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { initializeAdMob } from "@/lib/admob";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CreateTest from "./pages/CreateTest";
import TestPage from "./pages/TestPage";
import ResultsPage from "./pages/ResultsPage";
import Leaderboard from "./pages/Leaderboard";
import QuestionBank from "./pages/QuestionBank";
import BuyCredits from "./pages/BuyCredits";
import ResourceBank from "./pages/ResourceBank";
import PublicQuiz from "./pages/PublicQuiz";
import Referral from "./pages/Referral";
import NotFound from "./pages/NotFound";
import { GraduationCap } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <GraduationCap className="h-12 w-12 text-primary animate-pulse" />
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => {
  useEffect(() => {
    initializeAdMob();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<AuthRoute><AuthPage /></AuthRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create-test" element={<ProtectedRoute><CreateTest /></ProtectedRoute>} />
              <Route path="/test/:testId" element={<ProtectedRoute><TestPage /></ProtectedRoute>} />
              <Route path="/results/:testId" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/question-banks" element={<ProtectedRoute><QuestionBank /></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute><BuyCredits /></ProtectedRoute>} />
              <Route path="/resource-bank" element={<ProtectedRoute><ResourceBank /></ProtectedRoute>} />
              <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
              {/* Public quiz route — no auth required */}
              <Route path="/quiz/:code" element={<PublicQuiz />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
