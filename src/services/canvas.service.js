import chalk from 'chalk';

/**
 * Canvas LMS Service for managing student submissions and grading
 */
export class CanvasService {
  /**
   * @param {string} canvasToken - Canvas API bearer token
   * @param {string} baseUrl - Canvas instance base URL
   */
  constructor(canvasToken, baseUrl = 'https://bth.instructure.com') {
    if (!canvasToken) {
      throw new Error('Missing CANVAS_TOKEN environment variable');
    }
    this.token = canvasToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Update a student submission on Canvas with a grade and comment
   * @param {number} courseId - Canvas course ID
   * @param {number} assignmentId - Canvas assignment ID
   * @param {number} userId - Canvas user ID
   * @param {number} attempt - Submission attempt number
   * @param {number} status - HTTP status code from the GitHub operation (201/422 = pass, other = fail)
   * @param {string} comment - Comment to post on the submission
   * @returns {Promise<Response|void>}
   */
  async updateSubmission(courseId, assignmentId, userId, attempt, status, comment) {
    const urlencoded = new URLSearchParams();

    if ([201, 422].includes(status)) {
      urlencoded.append('submission[posted_grade]', 'G');
      urlencoded.append('comment[text_comment]', comment);
    } else {
      urlencoded.append('submission[posted_grade]', 'Ux');
      urlencoded.append('comment[text_comment]', comment + '\n\nKontakta kursansvarig om du behöver hjälp.');
    }
    urlencoded.append('comment[attempt]', attempt);

    console.log(chalk.blue(`[Canvas] Updating user ${userId} — status ${status}: ${comment}`));

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${this.token}`,
          },
          body: urlencoded,
        }
      );

      if (!response.ok) {
        console.error(chalk.red(`[Canvas] Failed to update user ${userId} (status=${response.status}): ${response.statusText}`));
      }

      return response;
    } catch (error) {
      console.error(chalk.red(`[Canvas] Failed for user ${userId}: ${error.message}`));
    }
  }

  /**
   * Fetch all student submissions with workflow_state "submitted" from Canvas
   * @param {number} courseId - Canvas course ID
   * @param {number} assignmentId - Canvas assignment ID
   * @returns {Promise<Array<{githubUsername: string, email: string, userId: number, attempt: number}>>}
   */
  async fetchStudentSubmissions(courseId, assignmentId) {
    let submitted = [];
    let result = [];
    let page = 1;

    do {
      submitted = submitted.concat(
        result
          .filter(item => item.workflow_state === 'submitted')
          .map(item => ({
            githubUsername: item.body.replace(/<[^>]*>/g, '').trim(),
            email: item.user.login_id,
            userId: item.user.id,
            attempt: item.attempt,
          }))
      );

      const url = `${this.baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions?per_page=100&page=${page}&include[]=user`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });

      if (!response.ok) {
        console.error(chalk.red(`[Canvas] HTTP error on page ${page} (status=${response.status}): ${response.statusText}`));
        break;
      }

      result = await response.json();
      page++;
    } while (result.length > 0);

    return submitted;
  }
}
