import { Octokit } from '@octokit/rest';

const { GITHUB_TOKEN } = process.env;
const octokit = new Octokit({auth: GITHUB_TOKEN});
export default octokit;
