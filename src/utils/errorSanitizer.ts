export const BOT_DETECTION_USER_MESSAGE =
  'YouTube is temporarily blocking this server from accessing the video. Please try again later.';

/**
 * Sanitizes internal/server error messages before displaying to end users.
 * Replaces any mention of cookies, bot challenges, or server environment variables
 * with a friendly, user-safe explanation.
 */
export function sanitizeErrorMessage(
  message?: string | null,
  code?: string | null
): string {
  if (code === 'BOT_DETECTION_BLOCKED') {
    return BOT_DETECTION_USER_MESSAGE;
  }
  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred. Please try again.';
  }
  const lower = message.toLowerCase();
  if (
    lower.includes('cookie') ||
    lower.includes('bot_detection') ||
    lower.includes('bot detection') ||
    lower.includes('sign in to confirm') ||
    lower.includes('not a bot') ||
    lower.includes('automated queries') ||
    lower.includes('render') ||
    lower.includes('environment variable')
  ) {
    return BOT_DETECTION_USER_MESSAGE;
  }
  return message;
}
