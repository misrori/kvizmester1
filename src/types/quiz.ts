export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'text-input';
  text: string;
  imageUrl?: string;
  options: QuizOption[];
  correctAnswer?: string;
  timeLimit?: number;
}

export interface Quiz {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  subject: string;
  grade_level: string;
  questions: QuizQuestion[];
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  teacher_id: string;
  quiz_id: string;
  code: string;
  status: 'waiting' | 'active' | 'completed';
  class_name: string;
  grade: string;
  notes: string;
  control_mode: 'auto' | 'manual';
  time_limit_seconds: number;
  show_results_to_students: boolean;
  current_question_index: number;
  session_number: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  student_name: string;
  student_session_id: string;
  joined_at: string;
  is_active: boolean;
}

export interface QuizAnswer {
  id: string;
  room_id: string;
  participant_id: string;
  question_index: number;
  answer: Record<string, unknown>;
  is_correct: boolean | null;
  time_taken_ms: number | null;
  score: number;
  session_number: number;
  answered_at: string;
}

// Helper to generate a student session ID
export const getStudentSessionId = (): string => {
  let id = sessionStorage.getItem('student_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('student_session_id', id);
  }
  return id;
};

// Helper to generate a new question
export const createEmptyQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  type: 'multiple-choice',
  text: '',
  options: [
    { id: crypto.randomUUID(), text: '', isCorrect: true },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
    { id: crypto.randomUUID(), text: '', isCorrect: false },
  ],
  timeLimit: 15,
});

// Generate a 6-digit room code
export const generateRoomCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Quiz answer color mapping (Kahoot-style)
export const ANSWER_COLORS = [
  { bg: 'bg-quiz-red', hover: 'hover:bg-quiz-red/90', icon: '▲' },
  { bg: 'bg-quiz-blue', hover: 'hover:bg-quiz-blue/90', icon: '◆' },
  { bg: 'bg-quiz-yellow', hover: 'hover:bg-quiz-yellow/90', icon: '●' },
  { bg: 'bg-quiz-green', hover: 'hover:bg-quiz-green/90', icon: '■' },
] as const;
