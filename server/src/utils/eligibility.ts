import { IListing } from '../models/listing.model';
import { IStudentProfile } from '../models/profile.model';

export type EligibilityStatus = 'eligible' | 'ineligible' | 'incomplete_profile';

export interface EligibilityCriterionResult {
  criterion: string;
  required: string;
  actual: string;
  met: boolean;
}

export interface EligibilityEvaluationResult {
  isEligible: boolean;
  status: EligibilityStatus;
  summary: string;
  criteria: EligibilityCriterionResult[];
  missingProfileFields: string[];
}

/**
 * Normalizes branch / department names and handles common acronyms (e.g. CSE, IT, ECE, EEE, ICE)
 */
export const normalizeDepartment = (dept: string): string[] => {
  if (!dept) return [];
  const clean = dept.trim().toLowerCase();
  const variations = new Set<string>([clean]);

  // Extract acronym inside parentheses e.g. "Computer Science and Engineering (CSE)" -> "cse"
  const acronymMatch = clean.match(/\(([a-z0-9]+)\)/i);
  if (acronymMatch && acronymMatch[1]) {
    variations.add(acronymMatch[1].toLowerCase());
  }

  // Remove parentheses e.g. "Computer Science and Engineering (CSE)" -> "computer science and engineering"
  const withoutParens = clean.replace(/\s*\([^)]*\)/g, '').trim();
  if (withoutParens) {
    variations.add(withoutParens);
  }

  // Handle '&' vs 'and'
  variations.add(clean.replace(/&/g, 'and').replace(/\s+/g, ' ').trim());
  variations.add(clean.replace(/\band\b/g, '&').replace(/\s+/g, ' ').trim());
  if (withoutParens) {
    variations.add(withoutParens.replace(/&/g, 'and').replace(/\s+/g, ' ').trim());
    variations.add(withoutParens.replace(/\band\b/g, '&').replace(/\s+/g, ' ').trim());
  }

  return Array.from(variations);
};

/**
 * Reusable evaluation function checking student profile against listing eligibility rules.
 * Never silently infers missing academic records.
 */
export const evaluateEligibility = (
  profile: Partial<IStudentProfile> | null | undefined,
  listing: IListing
): EligibilityEvaluationResult => {
  const missingProfileFields: string[] = [];

  // 1. Audit profile for required academic data
  if (!profile) {
    missingProfileFields.push('Full Profile', 'Cumulative CGPA', 'Department / Branch', 'Graduation Year');
  } else {
    if (profile.cgpa === null || profile.cgpa === undefined || typeof profile.cgpa !== 'number') {
      missingProfileFields.push('Cumulative CGPA');
    }
    if (!profile.department || profile.department.trim().length === 0) {
      missingProfileFields.push('Department / Branch');
    }
    if (
      profile.graduationYear === null ||
      profile.graduationYear === undefined ||
      typeof profile.graduationYear !== 'number'
    ) {
      missingProfileFields.push('Graduation Year');
    }
  }

  // If academic data is incomplete, return incomplete_profile status immediately
  if (missingProfileFields.length > 0) {
    return {
      isEligible: false,
      status: 'incomplete_profile',
      summary: `Your student profile is missing: ${missingProfileFields.join(
        ', '
      )}. Please update your profile to evaluate drive eligibility.`,
      criteria: [],
      missingProfileFields,
    };
  }

  const studentCgpa = profile!.cgpa!;
  const studentDept = profile!.department!.trim();
  const studentYear = profile!.graduationYear!;

  const criteria: EligibilityCriterionResult[] = [];

  // 2. Evaluate CGPA Cutoff
  const minCgpa = listing.eligibility?.minCgpa ?? 0;
  if (minCgpa > 0) {
    const met = studentCgpa >= minCgpa;
    criteria.push({
      criterion: 'Cumulative GPA (CGPA)',
      required: `Minimum ${minCgpa.toFixed(2)}`,
      actual: studentCgpa.toFixed(2),
      met,
    });
  } else {
    criteria.push({
      criterion: 'Cumulative GPA (CGPA)',
      required: 'No minimum cutoff',
      actual: studentCgpa.toFixed(2),
      met: true,
    });
  }

  // 3. Evaluate Department / Branch
  const eligibleDepts = listing.eligibility?.eligibleDepartments || [];
  if (eligibleDepts.length > 0) {
    const studentVariations = normalizeDepartment(studentDept);

    const met = eligibleDepts.some((listingDept) => {
      const listingVariations = normalizeDepartment(listingDept);
      return studentVariations.some((sVar) =>
        listingVariations.some((lVar) => {
          if (sVar === lVar) return true;
          if (sVar.length >= 3 && lVar.length >= 3) {
            return sVar.includes(lVar) || lVar.includes(sVar);
          }
          return false;
        })
      );
    });

    criteria.push({
      criterion: 'Department / Branch',
      required: eligibleDepts.join(', '),
      actual: studentDept,
      met,
    });
  } else {
    criteria.push({
      criterion: 'Department / Branch',
      required: 'All departments eligible',
      actual: studentDept,
      met: true,
    });
  }

  // 4. Evaluate Expected Graduation Year
  const eligibleYears = listing.eligibility?.eligibleGraduationYears || [];
  if (eligibleYears.length > 0) {
    const met = eligibleYears.some((year) => Number(year) === Number(studentYear));
    criteria.push({
      criterion: 'Expected Graduation Year',
      required: eligibleYears.map((y) => `Class of ${y}`).join(', '),
      actual: `Class of ${studentYear}`,
      met,
    });
  } else {
    criteria.push({
      criterion: 'Expected Graduation Year',
      required: 'All graduation batches eligible',
      actual: `Class of ${studentYear}`,
      met: true,
    });
  }

  // 5. Evaluate Application Deadline & Status
  const isPastDeadline = new Date() > new Date(listing.applicationDeadline);
  const isStatusPublished = listing.status === 'published';
  const isWindowOpen = isStatusPublished && !isPastDeadline;

  criteria.push({
    criterion: 'Application Window',
    required: 'Listing Published & Before Deadline',
    actual: !isStatusPublished
      ? `Listing ${listing.status}`
      : isPastDeadline
      ? 'Deadline Passed'
      : `Open until ${new Date(listing.applicationDeadline).toLocaleDateString()}`,
    met: isWindowOpen,
  });

  const allCriteriaMet = criteria.every((c) => c.met);

  return {
    isEligible: allCriteriaMet,
    status: allCriteriaMet ? 'eligible' : 'ineligible',
    summary: allCriteriaMet
      ? 'You meet all academic criteria and the drive is open for applications.'
      : 'You do not meet one or more eligibility criteria for this opportunity.',
    criteria,
    missingProfileFields: [],
  };
};
