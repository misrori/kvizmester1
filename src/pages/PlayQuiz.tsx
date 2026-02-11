import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Clock, CheckCircle2, Users, Zap, Send, Trophy } from 'lucide-react';
import type { Room, Quiz, QuizQuestion, RoomParticipant } from '@/types/quiz';

const COLORS = [
  { bg: 'bg-quiz-red', icon: '▲', label: 'A' },
  { bg: 'bg-quiz-blue', icon: '◆', label: 'B' },
  { bg: 'bg-quiz-yellow', icon: '●', label: 'C' },
  { bg: 'bg-quiz-green', icon: '■', label: 'D' },
  { bg: 'bg-primary', icon: '★', label: 'E' },
  { bg: 'bg-secondary', icon: '♦', label: 'F' },
];

const calculateScore = (isCorrect: boolean, timeTakenMs: number, timeLimitMs: number): number => {
  if (!isCorrect) return 0;
  const timeRatio = Math.max(0, 1 - timeTakenMs / timeLimitMs);
  return Math.round(100 + timeRatio * 900);
};

const PlayQuiz = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [answerCorrect, setAnswerCorrect] = useState<boolean | null>(null);
  const [earnedScore, setEarnedScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const currentQIndexRef = useRef(-1);

  const participantId = sessionStorage.getItem('participant_id');
  const studentName = sessionStorage.getItem('student_name');

  useEffect(() => {
    if (!participantId) {
      navigate('/join');
      return;
    }
    fetchRoomData();
  }, [roomId]);

  const fetchRoomData = async () => {
    if (!roomId) return;

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (!roomData) {
      toast.error('Szoba nem található');
      navigate('/');
      return;
    }

    const roomTyped = roomData as unknown as Room;
    setRoom(roomTyped);
    currentQIndexRef.current = roomTyped.current_question_index;

    const [quizRes, partRes] = await Promise.all([
      supabase.from('quizzes').select('*').eq('id', roomData.quiz_id).single(),
      supabase.from('room_participants').select('*').eq('room_id', roomId),
    ]);

    if (quizRes.data) {
      setQuiz({ ...quizRes.data, questions: quizRes.data.questions as unknown as QuizQuestion[] } as Quiz);
    }
    if (partRes.data) setParticipants(partRes.data as unknown as RoomParticipant[]);
    setLoading(false);
  };

  // Real-time subscription
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`play-${roomId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, (payload) => {
        const newRoom = payload.new as unknown as Room;
        setRoom(newRoom);

        if (newRoom.current_question_index !== currentQIndexRef.current) {
          currentQIndexRef.current = newRoom.current_question_index;
          setAnswered(false);
          setSelectedAnswer(null);
          setTextAnswer('');
          setAnswerCorrect(null);
          setEarnedScore(0);
          setQuestionStartTime(Date.now());
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` }, () => {
        supabase.from('room_participants').select('*').eq('room_id', roomId).then(({ data }) => {
          if (data) setParticipants(data as unknown as RoomParticipant[]);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  // Timer countdown
  useEffect(() => {
    if (!room || room.status !== 'active' || !quiz) return;
    const question = quiz.questions[room.current_question_index];
    if (!question) return;

    const timeLimit = question.timeLimit || room.time_limit_seconds || 15;
    setTimer(timeLimit);
    setQuestionStartTime(Date.now());

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.current_question_index, room?.status]);

  // Check if already answered this question
  useEffect(() => {
    if (!room || !participantId || room.status !== 'active') return;

    const checkExistingAnswer = async () => {
      const { data } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('participant_id', participantId)
        .eq('question_index', room.current_question_index)
        .eq('room_id', room.id)
        .eq('session_number', room.session_number)
        .maybeSingle();

      if (data) {
        setAnswered(true);
        setAnswerCorrect(data.is_correct);
        setEarnedScore((data as any).score || 0);
      }
    };
    checkExistingAnswer();
  }, [room?.current_question_index, participantId, room?.status]);

  const submitAnswer = async (optionId?: string) => {
    if (!room || !quiz || !participantId || answered) return;

    const question = quiz.questions[room.current_question_index];
    if (!question) return;

    let isCorrect = false;
    let answerData: Record<string, unknown> = {};

    if (question.type === 'multiple-choice' && optionId) {
      const selectedOption = question.options.find((o) => o.id === optionId);
      isCorrect = selectedOption?.isCorrect || false;
      answerData = { selectedOptionId: optionId };
      setSelectedAnswer(optionId);
    } else if (question.type === 'text-input') {
      isCorrect = textAnswer.trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      answerData = { text: textAnswer.trim() };
    }

    const timeTaken = Date.now() - questionStartTime;
    const timeLimitMs = (question.timeLimit || room.time_limit_seconds || 15) * 1000;
    const score = calculateScore(isCorrect, timeTaken, timeLimitMs);

    const { error } = await supabase.from('quiz_answers').insert({
      room_id: room.id,
      participant_id: participantId,
      question_index: room.current_question_index,
      answer: JSON.parse(JSON.stringify(answerData)),
      is_correct: isCorrect,
      time_taken_ms: timeTaken,
      score,
      session_number: room.session_number,
    } as any);

    if (error) {
      toast.error('Hiba a válasz elküldésekor');
      return;
    }

    setAnswered(true);
    setAnswerCorrect(isCorrect);
    setEarnedScore(score);

    if (room.control_mode === 'auto') {
      const nextIndex = room.current_question_index + 1;
      if (nextIndex < quiz.questions.length) {
        setTimeout(() => {
          currentQIndexRef.current = nextIndex;
          setRoom((prev) => prev ? { ...prev, current_question_index: nextIndex } : prev);
          setAnswered(false);
          setSelectedAnswer(null);
          setTextAnswer('');
          setAnswerCorrect(null);
          setEarnedScore(0);
          setQuestionStartTime(Date.now());
        }, 1500);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  if (!room || !quiz) return null;

  // Waiting Room
  if (room.status === 'waiting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Várakozás...</h1>
          <p className="mt-2 text-muted-foreground">A tanár hamarosan elindítja a kvízt</p>
          <div className="mt-6 font-display text-5xl font-black tracking-widest text-primary animate-pulse-slow">{room.code}</div>
          <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span>{participants.length} résztvevő</span>
          </div>
          {studentName && (
            <div className="mt-4 rounded-lg bg-muted px-4 py-2">
              <span className="text-sm text-muted-foreground">Te:</span>{' '}
              <span className="font-medium">{studentName}</span>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Quiz Completed
  if (room.status === 'completed') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-quiz-green/20 via-background to-primary/10 p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-20 w-20 text-quiz-green" />
          <h1 className="font-display text-3xl font-bold">Kvíz vége!</h1>
          <p className="mt-2 text-muted-foreground">Köszönjük a részvételt!</p>
          {room.show_results_to_students && (
            <Button className="mt-6" onClick={() => navigate(`/results/${room.id}`)}>
              Eredmények megtekintése
            </Button>
          )}
          <Button variant="ghost" className="mt-3" onClick={() => navigate('/')}>
            Vissza a főoldalra
          </Button>
        </motion.div>
      </div>
    );
  }

  // Active Quiz - Show Question
  const question = quiz.questions[room.current_question_index];
  if (!question) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {room.current_question_index + 1}/{quiz.questions.length}
        </div>
        <div className={`flex items-center gap-2 font-display text-xl font-bold ${timer <= 5 ? 'text-destructive' : 'text-foreground'}`}>
          <Clock className="h-5 w-5" />
          {timer}s
        </div>
        <div className="text-sm text-muted-foreground">{studentName}</div>
      </div>

      {/* Question */}
      <div className="flex flex-1 flex-col p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={room.current_question_index}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-1 flex-col"
          >
            <div className="mb-6 rounded-xl bg-card p-6 text-center shadow-sm">
              <h2 className="font-display text-xl font-bold text-card-foreground md:text-2xl">
                {question.text}
              </h2>
              {question.imageUrl && (
                <img
                  src={question.imageUrl}
                  alt="Kérdés kép"
                  className="mx-auto mt-4 max-h-48 rounded-lg object-contain"
                />
              )}
            </div>

            {/* Answer Feedback */}
            {answered && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`mb-4 rounded-xl p-4 text-center text-primary-foreground ${
                  answerCorrect ? 'bg-quiz-green' : 'bg-destructive'
                }`}
              >
                <div className="text-lg font-bold">
                  {answerCorrect ? '✓ Helyes válasz!' : '✗ Helytelen válasz'}
                </div>
                {earnedScore > 0 && (
                  <div className="mt-1 flex items-center justify-center gap-1 text-sm">
                    <Trophy className="h-4 w-4" />
                    +{earnedScore} pont
                  </div>
                )}
              </motion.div>
            )}

            {/* Multiple Choice Answers */}
            {question.type === 'multiple-choice' && (
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                {question.options.map((option, i) => {
                  const color = COLORS[i % COLORS.length];
                  const isSelected = selectedAnswer === option.id;
                  return (
                    <motion.button
                      key={option.id}
                      whileHover={!answered ? { scale: 1.02 } : {}}
                      whileTap={!answered ? { scale: 0.98 } : {}}
                      onClick={() => !answered && submitAnswer(option.id)}
                      disabled={answered}
                      className={`flex items-center gap-4 rounded-xl p-5 text-left text-lg font-bold text-primary-foreground transition-all ${color.bg} ${
                        answered
                          ? isSelected
                            ? 'ring-4 ring-foreground/30'
                            : 'opacity-50'
                          : 'hover:brightness-110 active:brightness-90'
                      }`}
                    >
                      <span className="text-2xl">{color.icon}</span>
                      <span>{option.text || `Válasz ${i + 1}`}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Text Input Answer */}
            {question.type === 'text-input' && !answered && (
              <div className="flex gap-3">
                <Input
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder="Írd be a válaszod..."
                  className="text-lg"
                  autoFocus
                />
                <Button size="lg" onClick={() => submitAnswer()} disabled={!textAnswer.trim()}>
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayQuiz;
