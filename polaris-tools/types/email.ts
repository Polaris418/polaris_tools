// ============================================================================
// Email System Types
// ============================================================================

/**
 * Email template type
 * Represents an email template with HTML/text content and variables
 */
export interface EmailTemplate {
  id: number;
  code: string;
  name: string;
  language: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  version: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email queue item type
 * Represents a queued email waiting to be sent
 */
export interface EmailQueueItem {
  id: number;
  recipient: string;
  subject: string;
  emailType: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  retryCount: number;
  scheduledAt: string;
  sentAt?: string;
  errorMessage?: string;
}

/**
 * Suppression list entry type
 * Represents an email address that should not receive emails
 */
export interface SuppressionEntry {
  id: number;
  email: string;
  reason: 'HARD_BOUNCE' | 'SOFT_BOUNCE' | 'COMPLAINT';
  source: string;
  softBounceCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email preferences type
 * Represents user's email subscription preferences
 */
export interface EmailPreferences {
  userId: number;
  systemNotifications: boolean;
  marketingEmails: boolean;
  productUpdates: boolean;
  updatedAt: string;
}

/**
 * Email metrics type
 * Represents email sending statistics and performance metrics
 */
export interface EmailMetrics {
  totalSent: number;
  successCount: number;
  failureCount: number;
  bounceCount: number;
  complaintCount: number;
  successRate: number;
  bounceRate: number;
  complaintRate: number;
  averageDelay: number;
}
