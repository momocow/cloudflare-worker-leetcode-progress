import { gql, GraphQLClient } from 'graphql-request';
import pupa from 'pupa';
import tplDark from './progress-dark.svg';
import tpl from './progress.svg';

export type ProgressType = 'global' | 'session';

export interface GetLeetcodeProgressOptions {
  leetcodeGraphqlUrl?: string;
  /**
   * `graphql-request` defaults to use `cross-fetch` which depends on
   * XMLHttpRequest in a browser-like environment.
   *
   * Override it to the Cloudflare-implemented `WindowOrWorkerGlobalScope.fetch`
   * by default since Cloudflare Worker runtime does not support XMLHttpRequest.
   */
  fetch?: typeof fetch;
}

export interface ProblemCount {
  all: number;
  easy: number;
  medium: number;
  hard: number;
}

export interface ProblemCountArrayItem {
  difficulty: keyof ProblemCount;
  count: number;
}

export interface LeetcodeProgress {
  username: string;
  total: ProblemCount;
  ac: ProblemCount;
}

const globalQuery = gql`
  query getUserProfile($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

const sessionQuery = gql`
  query userSessionProgress($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      submitStats {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

export function reduceProblemCountArray(
  arr: ProblemCountArrayItem[] = [],
): ProblemCount {
  return arr.reduce(
    (problems, item) =>
      Object.assign(problems, { [item.difficulty.toLowerCase()]: item.count }),
    { all: 0, easy: 0, medium: 0, hard: 0 },
  );
}

export async function fetchProgress(
  username: string,
  progressType: ProgressType,
  {
    leetcodeGraphqlUrl = 'https://leetcode.com/graphql',
    fetch: _fetch = fetch,
  }: GetLeetcodeProgressOptions = {},
): Promise<LeetcodeProgress> {
  const client = new GraphQLClient(leetcodeGraphqlUrl, { fetch: _fetch });
  const result = await client.request(
    progressType === 'global' ? globalQuery : sessionQuery,
    { username },
  );
  return {
    username,
    total: reduceProblemCountArray(result?.allQuestionsCount),
    ac: reduceProblemCountArray(
      result?.matchedUser?.submitStats?.acSubmissionNum,
    ),
  };
}

export const renderProgress = (theme: string) =>
  pupa.bind(null, theme === 'dark' ? tplDark : tpl);
