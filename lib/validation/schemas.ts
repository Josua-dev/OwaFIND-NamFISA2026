import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name').max(100),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const identityVerificationSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name').max(100),
  national_id: z.string().min(6, 'Enter a valid ID number').max(30),
  date_of_birth: z.string().min(1, 'Enter your date of birth'),
  phone: z.string().min(6, 'Enter a valid phone number').max(20),
  email: z.string().email('Enter a valid email address'),
  employer: z.string().optional().nullable(),
  employee_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const claimCreationSchema = z.object({
  match_id: z.string().uuid(),
  reason: z.string().optional().nullable(),
});

export const documentUploadSchema = z.object({
  claim_id: z.string().uuid(),
  document_type: z.enum([
    'IDENTITY_DOCUMENT',
    'PROOF_OF_EMPLOYMENT',
    'MARRIAGE_CERTIFICATE',
    'DEATH_CERTIFICATE',
    'BANK_CONFIRMATION',
    'OTHER_SUPPORTING_EVIDENCE',
  ]),
});

export const claimDecisionSchema = z.object({
  claim_id: z.string().uuid(),
  reason: z.string().min(10, 'Provide a detailed reason (at least 10 characters)'),
  action: z.enum(['approve', 'reject', 'request_info']),
  requested_document_type: z.string().optional(),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type IdentityVerificationInput = z.infer<typeof identityVerificationSchema>;
export type ClaimCreationInput = z.infer<typeof claimCreationSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type ClaimDecisionInput = z.infer<typeof claimDecisionSchema>;
