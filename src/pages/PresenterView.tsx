import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, SkipForward, Maximize, Minimize, Users, Trophy, BarChart3, Clock } from 'lucide-react';
import type { Room, Quiz, QuizQuestion, RoomParticipant, QuizAnswer } from '@/types/quiz';

const COLORS = [
  { bg: 'bg-quiz-red', icon: '▲' },
  { bg: 'bg-quiz-blue', icon: '◆' },
  { bg: 'bg-quiz-yellow', icon: '●' },
  { bg: 'bg-quiz-green', icon: '■' },
  { bg: 'bg-primary', icon: '★' },
  { bg: 'bg-secondary', icon: '♦' },
];

const PresenterView = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [timer, setTimer] = useState(0);

  const fetchRoomData = useCallback(async () => {
    if (!id || !user) return;
    const { data: roomData } = await supabase.from('rooms').select('*').eq('id', id).single();
    if (!roomData) { navigate('/dashboard'); return; }

    const rm = roomData as unknown as Room;
    setRoom(rm);

    const [quizRes, partRes, ansRes] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', roomData.quiz_id).single(),
      supabase.from('room_participants').select('*').eq('room_id', id).eq('is_active', true).order('joined_at'),
      supabase.from('quiz_answers').select('*').eq('room_id', id).eq('session_number', rm.session_number),
    ]);

    if (quizRes.data) setQuiz({ ...quizRes.data, questions: quizRes.data.questions as unknown as QuizQuestion[] } as Quiz);
    if (partRes.data) setParticipants(partRes.data as unknown as RoomParticipant[]);
    if (ansRes.data) setAnswers(ansRes.data as unknown as QuizAnswer[]);
    setLoading(false);
  }, [id, user, navigate]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => { fetchRoomData(); }, [fetchRoomData]);

  // Real-time
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`presenter-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` }, () => {
        supabase.from('room_participants').select('*').eq('room_id', id).eq('is_active', true).order('joined_at').then(({ data }) => {
          if (data) setParticipants(data as unknown as RoomParticipant[]);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_answers', filter: `room_id=eq.${id}` }, () => {
        supabase.from('quiz_answers').select('*').eq('room_id', id).then(({ data }) => {
          if (data) setAnswers(data as unknown as QuizAnswer[]);
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` }, (payload) => {
        setRoom(payload.new as unknown as Room);
        setShowLeaderboard(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Timer
  useEffect(() => {
    if (!room || room.status !== 'active' || !quiz) return;
    const question = quiz.questions[room.current_question_index];
    if (!question) return;
    const timeLimit = question.timeLimit || room.time_limit_seconds || 15;
    setTimer(timeLimit);
    const interval = setInterval(() => {
      setTimer((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.current_question_index, room?.status]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const startQuiz = async () => {
    if (!room) return;
    await supabase.from('rooms').update({ status: 'active', started_at: new Date().toISOString(), current_question_index: 0 }).eq('id', room.id);
    toast.success('Kvíz elindítva!');
  };

  const nextQuestion = async () => {
    if (!room || !quiz) return;
    const nextIndex = room.current_question_index + 1;
    if (nextIndex >= quiz.questions.length) {
      await supabase.from('rooms').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', room.id);
      toast.success('Kvíz befejezve!');
      return;
    }
    await supabase.from('rooms').update({ current_question_index: nextIndex }).eq('id', room.id);
    setShowLeaderboard(false);
  };

  const endQuiz = async () => {
    if (!room) return;
    await supabase.from('rooms').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', room.id);
    toast.success('Kvíz befejezve!');
  };

  const getLeaderboard = () => {
    const sessionAnswers = answers.filter((a) => (a as any).session_number === (room?.session_number || 1));
    return participants.map((p) => {
      const sa = sessionAnswers.filter((a) => a.participant_id === p.id);
      const totalScore = sa.reduce((sum, a) => sum + ((a as any).score || 0), 0);
      const correctCount = sa.filter((a) => a.is_correct).length;
      return { ...p, totalScore, correctCount };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  if (authLoading || loading || !room || !quiz) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  const currentQuestion: QuizQuestion | undefined = quiz.questions[room.current_question_index];
  const answersForCurrentQ = answers.filter((a) => a.question_index === room.current_question_index && (a as any).session_number === room.session_number);
  const totalParticipants = participants.length;
  const leaderboard = getLeaderboard();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="font-display text-2xl font-black tracking-widest text-primary">{room.code}</div>
          <Badge variant={room.status === 'active' ? 'default' : 'outline'}>
            {room.status === 'waiting' ? 'Várakozik' : room.status === 'active' ? 'Aktív' : 'Befejezett'}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {totalParticipants}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {room.status === 'waiting' && (
            <Button onClick={startQuiz} disabled={totalParticipants === 0}>
              <Play className="mr-2 h-4 w-4" /> Indítás
            </Button>
          )}
          {room.status === 'active' && (
            <>
              <Button variant="outline" onClick={() => setShowLeaderboard(!showLeaderboard)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                {showLeaderboard ? 'Kérdés' : 'Ranglista'}
              </Button>
              <Button onClick={nextQuestion}>
                <SkipForward className="mr-2 h-4 w-4" />
                {room.current_question_index + 1 >= quiz.questions.length ? 'Befejezés' : 'Következő'}
              </Button>
              <Button variant="destructive" size="sm" onClick={endQuiz}>
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {room.status === 'waiting' && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
              <div className="font-display text-8xl font-black tracking-widest text-primary">{room.code}</div>
              <p className="mt-6 text-2xl text-muted-foreground">Várakozás a diákokra...</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-lg text-muted-foreground">
                <Users className="h-6 w-6" /> {totalParticipants} diák csatlakozott
              </div>
            </motion.div>
          )}

          {room.status === 'active' && showLeaderboard && (
            <motion.div key="leaderboard" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="w-full max-w-2xl">
              <h2 className="mb-6 text-center font-display text-3xl font-bold flex items-center justify-center gap-3">
                <Trophy className="h-8 w-8 text-accent" /> Ranglista
              </h2>
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((student, i) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center justify-between rounded-xl border p-4 ${i === 0 ? 'border-accent bg-accent/10 text-lg' : i < 3 ? 'border-primary/30 bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-display text-2xl font-bold text-muted-foreground w-10">{i + 1}.</span>
                      <span className="font-medium text-lg">{student.student_name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-display text-xl font-bold text-primary">
                      <Trophy className="h-5 w-5" /> {student.totalScore}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {room.status === 'active' && !showLeaderboard && currentQuestion && (
            <motion.div key={`q-${room.current_question_index}`} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="w-full max-w-4xl">
              {/* Timer and progress */}
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg text-muted-foreground">
                  {room.current_question_index + 1} / {quiz.questions.length}
                </span>
                <div className={`flex items-center gap-2 font-display text-3xl font-bold ${timer <= 5 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                  <Clock className="h-7 w-7" /> {timer}s
                </div>
                <span className="text-sm text-muted-foreground">
                  {answersForCurrentQ.length}/{totalParticipants} válaszolt
                </span>
              </div>

              {/* Question */}
              <div className="mb-8 rounded-2xl bg-card p-8 text-center shadow-lg">
                <h2 className="font-display text-2xl font-bold text-card-foreground md:text-4xl">
                  {currentQuestion.text}
                </h2>
                {currentQuestion.imageUrl && (
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Kérdés kép"
                    className="mx-auto mt-6 max-h-64 rounded-xl object-contain"
                  />
                )}
              </div>

              {/* Answer options - WITHOUT correct answer indicators */}
              {currentQuestion.type === 'multiple-choice' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {currentQuestion.options.map((opt, i) => {
                    const color = COLORS[i % COLORS.length];
                    const answeredCount = answersForCurrentQ.filter(
                      (a) => (a.answer as any)?.selectedOptionId === opt.id
                    ).length;
                    return (
                      <div
                        key={opt.id}
                        className={`flex items-center justify-between rounded-xl p-5 text-primary-foreground ${color.bg}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{color.icon}</span>
                          <span className="text-lg font-bold">{opt.text || `Válasz ${i + 1}`}</span>
                        </div>
                        <Badge variant="secondary" className="text-base">{answeredCount}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {room.status === 'completed' && (
            <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
              <Trophy className="mx-auto mb-6 h-24 w-24 text-accent" />
              <h2 className="font-display text-4xl font-bold">Kvíz befejezve!</h2>
              {leaderboard.length > 0 && (
                <div className="mt-8">
                  <p className="mb-4 text-xl text-muted-foreground">Győztes:</p>
                  <div className="font-display text-3xl font-bold text-primary">{leaderboard[0]?.student_name}</div>
                  <div className="mt-2 text-xl text-muted-foreground">{leaderboard[0]?.totalScore} pont</div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PresenterView;
