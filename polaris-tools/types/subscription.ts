/**
 * 订阅相关类型
 */

export interface SubscriptionPreferenceResponse {
  id: number;
  userId: number;
  emailType: string;
  subscribed: boolean;
  updatedAt: string;
  createdAt: string;
}
