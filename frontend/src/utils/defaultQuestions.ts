import type { QuestionType } from '../types/event';

export interface DefaultQuestion {
  id: string;
  questionText: string;
  type: QuestionType;
  options: string[];
  isRequired: boolean;
}

export const STANDARD_DEFAULT_QUESTIONS: DefaultQuestion[] = [
  {
    id: 'def_q_1',
    questionText: 'What best describes you?',
    type: 'choice',
    options: [
      'Student',
      'Professional',
      'Entrepreneur / Business Owner',
      'Researcher / Academic',
      'Job Seeker',
      'Other',
    ],
    isRequired: true,
  },
  {
    id: 'def_q_2',
    questionText: 'What are your main areas of interest or expertise?',
    type: 'text',
    options: [],
    isRequired: true,
  },
  {
    id: 'def_q_3',
    questionText: 'What organization, company, or institution are you affiliated with?',
    type: 'text',
    options: [],
    isRequired: true,
  },
  {
    id: 'def_q_4',
    questionText: 'What are you hoping to gain from this event?',
    type: 'multi_choice',
    options: [
      'Learn new skills & practical knowledge',
      'Network with peers & industry professionals',
      'Explore career & job opportunities',
      'Gain hands-on experience / projects',
      'Discover new tools & technologies',
      'Explore business partnerships & collaborations',
      'Other',
    ],
    isRequired: true,
  },
];

const getStorageKey = (organizerId?: string) => {
  return organizerId ? `sheeba_org_default_questions_${organizerId}` : 'sheeba_org_default_questions';
};

/**
 * Retrieve the organizer's default questions from localStorage.
 * Falls back to STANDARD_DEFAULT_QUESTIONS (the 4 standard questions) if not customized.
 */
export const getOrganizerDefaultQuestions = (organizerId?: string): DefaultQuestion[] => {
  try {
    const key = getStorageKey(organizerId);
    const stored = localStorage.getItem(key) || localStorage.getItem('sheeba_org_default_questions');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load organizer default questions:', err);
  }
  return STANDARD_DEFAULT_QUESTIONS.map((q) => ({
    ...q,
    options: [...q.options],
  }));
};

/**
 * Save the organizer's customized default questions into localStorage.
 */
export const saveOrganizerDefaultQuestions = (
  questions: DefaultQuestion[],
  organizerId?: string
): void => {
  try {
    const serialized = JSON.stringify(questions);
    const key = getStorageKey(organizerId);
    localStorage.setItem(key, serialized);
    localStorage.setItem('sheeba_org_default_questions', serialized);
  } catch (err) {
    console.error('Failed to save organizer default questions:', err);
  }
};
