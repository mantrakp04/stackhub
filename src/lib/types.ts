export type GithubPr = {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: 'open' | 'closed';
  draft: boolean;
  head: { ref: string };
  base: { ref: string };
  user: { login: string };
};

export type StackNode = {
  pr: GithubPr;
  children: StackNode[];
  parent?: number;
};

export type Settings = {
  token: string;
  owner: string;
  repo: string;
};
