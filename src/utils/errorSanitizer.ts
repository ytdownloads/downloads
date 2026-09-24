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
  if (code === 'AGE_RESTRICTED') {
    return 'This video is age-restricted and requires authentication.';
  }
  if (code === 'VIDEO_UNAVAILABLE') {
    return 'This video is unavailable, private, or removed.';
  }
  if (code === 'PLAYLIST_UNAVAILABLE') {
    return 'This playlist is unavailable, private, or does not exist.';
  }
  if (code === 'PLAYLIST_TOO_LARGE') {
    return 'Playlists with more than 30 videos are not supported.';
  }
  if (code === 'DOWNLOAD_FORBIDDEN') {
    return 'YouTube is temporarily blocking direct streaming for this video on the server. Please try again later.';
  }
  if (code === 'SERVER_UNAVAILABLE') {
    return 'Server is currently waking up or unavailable. Please wait a moment and try again.';
  }
  if (code === 'TIMEOUT' || code === 'DOWNLOAD_TIMEOUT') {
    return 'Request timed out. Please try again.';
  }
  if (code === 'INVALID_REQUEST' || code === 'INVALID_URL') {
    return message || 'The YouTube URL is invalid or malformed.';
  }

  if (!message || typeof message !== 'string') {
    return 'An unexpected error occurred. Please try again.';
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('cookie') ||
    lower.includes('bot_detection') ||
    lower.includes('bot detection') ||
    lower.includes('automated queries') ||
    lower.includes('render') ||
    lower.includes('environment variable')
  ) {
    return BOT_DETECTION_USER_MESSAGE;
  }

  return message;
}
