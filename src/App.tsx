import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import QuizEditor from "./pages/QuizEditor";
import AIGenerate from "./pages/AIGenerate";
import CreateRoom from "./pages/CreateRoom";
import RoomControl from "./pages/RoomControl";
import JoinRoom from "./pages/JoinRoom";
import PlayQuiz from "./pages/PlayQuiz";
import Results from "./pages/Results";
import PresenterView from "./pages/PresenterView";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/quiz/new" element={<QuizEditor />} />
          <Route path="/quiz/:id/edit" element={<QuizEditor />} />
          <Route path="/ai-generate" element={<AIGenerate />} />
          <Route path="/room/new" element={<CreateRoom />} />
          <Route path="/room/:id" element={<RoomControl />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/join/:code" element={<JoinRoom />} />
          <Route path="/play/:roomId" element={<PlayQuiz />} />
          <Route path="/results/:roomId" element={<Results />} />
          <Route path="/presenter/:id" element={<PresenterView />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
