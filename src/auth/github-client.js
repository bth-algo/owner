import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * User roles for GitHub access
 */
export const UserRole = {
  ADMIN: 'admin',
  STUDENT: 'student'
};

/**
 * Load credentials from environment variables
 * @returns {object} Credentials object with tokens and organization name
 * @throws {Error} If required environment variables are missing
 */
export function loadCredentials() {
  const adminToken = process.env.GITHUB_ADMIN_TOKEN;
  const studentToken = process.env.GITHUB_STUDENT_TOKEN;
  const orgName = process.env.GITHUB_ORG_NAME;

  if (!adminToken) {
    throw new Error('Missing GITHUB_ADMIN_TOKEN environment variable');
  }
  if (!studentToken) {
    throw new Error('Missing GITHUB_STUDENT_TOKEN environment variable');
  }
  if (!orgName) {
    throw new Error('Missing GITHUB_ORG_NAME environment variable');
  }

  return {
    adminToken,
    studentToken,
    organizationName: orgName
  };
}

/**
 * Create a GitHub client for a specific role
 * @param {string} role - User role (UserRole.ADMIN or UserRole.STUDENT)
 * @returns {Octokit} Authenticated Octokit instance
 * @throws {Error} If invalid role is provided
 */
export function getGithubClient(role) {
  const credentials = loadCredentials();
  
  let token;
  if (role === UserRole.ADMIN) {
    token = credentials.adminToken;
  } else if (role === UserRole.STUDENT) {
    token = credentials.studentToken;
  } else {
    throw new Error(`Invalid role: ${role}. Must be 'admin' or 'student'`);
  }

  return new Octokit({
    auth: token,
    userAgent: 'bth-algo-manager v1.0.0',
    baseUrl: 'https://api.github.com'
  });
}

/**
 * Get the organization name from environment variables
 * @returns {string} Organization name
 */
export function getOrganizationName() {
  const credentials = loadCredentials();
  return credentials.organizationName;
}
