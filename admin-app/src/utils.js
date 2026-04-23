/**
 * Build the candidate interview URL based on current environment.
 * - Dev (port 3001): candidate app runs on port 3002
 * - Production: candidate app is at /candidate/ on same host
 */
export function buildInterviewUrl(token) {
  const { protocol, hostname, port } = window.location;
  if (port === '3001') {
    // Local dev: candidate app on port 3002
    return `${protocol}//${hostname}:3002/interview/${token}`;
  }
  // Production: same host, /candidate/ path
  return `${protocol}//${hostname}/candidate/interview/${token}`;
}
