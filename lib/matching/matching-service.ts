import type { MatchSignal, MatchResult, MatchClassification } from '@/types/database';

const WEIGHTS = {
  national_id: 0.40,
  date_of_birth: 0.15,
  name: 0.15,
  employer: 0.15,
  phone: 0.10,
  email: 0.05,
};

export const MATCH_WEIGHTS = WEIGHTS;

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[^a-z\s]/g, '');
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return Math.max(0, 1 - dist / maxLen);
}

interface MatchInput {
  national_id?: string | null;
  name?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  email?: string | null;
  employer?: string | null;
  employee_number?: string | null;
}

export function calculateMatch(
  beneficiary: MatchInput,
  benefitRecord: MatchInput
): MatchResult {
  const signals: MatchSignal[] = [];

  // National ID
  if (beneficiary.national_id && benefitRecord.national_id) {
    const exact = beneficiary.national_id.replace(/\s|-/g, '') === benefitRecord.national_id.replace(/\s|-/g, '');
    signals.push({
      field: 'national_id',
      result: exact ? 'exact' : 'no_match',
      weight: WEIGHTS.national_id,
      detail: exact ? 'National ID matches exactly' : 'National ID does not match',
    });
  }

  // Date of birth
  if (beneficiary.date_of_birth && benefitRecord.date_of_birth) {
    const exact = beneficiary.date_of_birth === benefitRecord.date_of_birth;
    signals.push({
      field: 'date_of_birth',
      result: exact ? 'exact' : 'no_match',
      weight: WEIGHTS.date_of_birth,
      detail: exact ? 'Date of birth matches exactly' : 'Date of birth does not match',
    });
  }

  // Name
  if (beneficiary.name && benefitRecord.name) {
    const sim = nameSimilarity(beneficiary.name, benefitRecord.name);
    const result = sim >= 0.95 ? 'exact' : sim >= 0.80 ? 'strong' : sim >= 0.60 ? 'partial' : 'no_match';
    signals.push({
      field: 'name',
      result,
      weight: WEIGHTS.name,
      detail: `Name similarity: ${Math.round(sim * 100)}%`,
    });
  }

  // Employer
  if (beneficiary.employer && benefitRecord.employer) {
    const sim = nameSimilarity(beneficiary.employer, benefitRecord.employer);
    const result = sim >= 0.85 ? 'match' : sim >= 0.60 ? 'partial' : 'no_match';
    signals.push({
      field: 'employer',
      result,
      weight: WEIGHTS.employer,
      detail: result === 'match' ? 'Employer matches' : `Employer similarity: ${Math.round(sim * 100)}%`,
    });
  }

  // Phone
  if (beneficiary.phone && benefitRecord.phone) {
    const cleanA = beneficiary.phone.replace(/\D/g, '').slice(-9);
    const cleanB = benefitRecord.phone.replace(/\D/g, '').slice(-9);
    const exact = cleanA === cleanB && cleanA.length > 0;
    signals.push({
      field: 'phone',
      result: exact ? 'match' : 'no_match',
      weight: WEIGHTS.phone,
      detail: exact ? 'Phone number matches' : 'Phone number does not match',
    });
  }

  // Email
  if (beneficiary.email && benefitRecord.email) {
    const exact = beneficiary.email.toLowerCase().trim() === benefitRecord.email.toLowerCase().trim();
    signals.push({
      field: 'email',
      result: exact ? 'match' : 'no_match',
      weight: WEIGHTS.email,
      detail: exact ? 'Email matches' : 'Email does not match',
    });
  }

  const score = signals.reduce((sum, s) => {
    const contribution =
      s.result === 'exact' || s.result === 'match'
        ? s.weight
        : s.result === 'strong'
        ? s.weight * 0.85
        : s.result === 'partial'
        ? s.weight * 0.50
        : 0;
    return sum + contribution;
  }, 0);

  const classification = classifyMatch(score);

  return {
    score: Math.round(score * 100) / 100,
    classification,
    signals,
  };
}

export function classifyMatch(score: number): MatchClassification {
  if (score >= 0.75) return 'GREEN';
  if (score >= 0.45) return 'AMBER';
  return 'RED';
}

export function generateSignals(beneficiary: MatchInput, benefitRecord: MatchInput): MatchSignal[] {
  return calculateMatch(beneficiary, benefitRecord).signals;
}
