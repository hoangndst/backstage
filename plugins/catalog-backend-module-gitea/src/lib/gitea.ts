import { Entity } from '@backstage/catalog-model';
import { GiteaIntegrationConfig } from '@backstage/integration';
import { graphql } from '@octokit/graphql';
import { AxiosInstance } from 'axios';
import {
  defaultOrganizationTeamTransformer,
  defaultUserTransformer,
  TeamTransformer,
  TransformerContext,
  UserTransformer,
} from './defaultTransformers';
import { withLocations } from './withLocations';

import { DeferredEntity } from '@backstage/plugin-catalog-node';

// Graphql types

export type QueryResponse = {
  organization?: OrganizationResponse;
  repositoryOwner?: RepositoryOwnerResponse;
  user?: UserResponse;
};

type RepositoryOwnerResponse = {
  repositories?: Connection<RepositoryResponse>;
  repository?: RepositoryResponse;
};

export type OrganizationResponse = {
  membersWithRole?: Connection<GiteaUser>;
  team?: GiteaTeamResponse;
  teams?: Connection<GiteaTeamResponse>;
  repositories?: Connection<RepositoryResponse>;
};

export type UserResponse = {
  organizations?: Connection<GiteaOrg>;
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string;
};

export type GiteaOrg = {
  login: string;
};

/**
 * Gitea User
 *
 * @public
 */
export type GiteaUser = {
  id: number;
  username: string;
  email?: string;
  full_name: string;
  active: boolean;
  html_url: string;
  avatar_url: string;
  description?: string;
  orgs?: GiteaOrganization[];
  is_admin?: boolean;
};

/**
 * Gitea Organization
 *
 * @public
 */
export type GiteaOrganization = {
  id: number;
  name: string;
  full_name?: string;
  full_path: string;
  edit_url: string;
  avatar_url?: string;
  description?: string;
  visibility?: string;
  members: GiteaUser[];
};

// export type GiteaTeamResponse = Omit<GiteaTeam, 'members'> & {
//   members: Connection<GiteaUser>;
// };

export type RepositoryResponse = {
  name: string;
  url: string;
  isArchived: boolean;
  isFork: boolean;
  repositoryTopics: RepositoryTopics;
  defaultBranchRef: {
    name: string;
  } | null;
  catalogInfoFile: {
    __typename: string;
    id: string;
    text: string;
  } | null;
  visibility: string;
};

type RepositoryTopics = {
  nodes: TopicNodes[];
};

type TopicNodes = {
  topic: {
    name: string;
  };
};

export type Connection<T> = {
  pageInfo: PageInfo;
  nodes: T[];
};

/**
 * Gets all the users out of a Gitea organization.
 *
 * Note that the users will not have their memberships filled in.
 *
 * @param client - An octokit graphql client
 * @param org - The slug of the org to read
 */
export async function getOrganizationUsers(
  client: AxiosInstance,
  org: string,
  userTransformer: UserTransformer = defaultUserTransformer,
): Promise<{ users: Entity[] }> {
  

  return { users };
}

/**
 * Gets all the teams out of a Gitea organization.
 *
 * Note that the teams will not have any relations apart from parent filled in.
 *
 * @param client - An octokit graphql client
 * @param org - The slug of the org to read
 */
export async function getOrganizationTeams(
  client: typeof graphql,
  org: string,
  teamTransformer: TeamTransformer = defaultOrganizationTeamTransformer,
): Promise<{
  teams: Entity[];
}> {
  const query = `
    query teams($org: String!, $cursor: String) {
      organization(login: $org) {
        teams(first: 50, after: $cursor) {
          pageInfo { hasNextPage, endCursor }
          nodes {
            slug
            combinedSlug
            name
            description
            avatarUrl
            editTeamUrl
            parentTeam { slug }
            members(first: 100, membership: IMMEDIATE) {
              pageInfo { hasNextPage }
              nodes {
                avatarUrl,
                bio,
                email,
                login,
                name,
                organizationVerifiedDomainEmails(login: $org)
               }
            }
          }
        }
      }
    }`;

  const materialisedTeams = async (
    item: GiteaTeamResponse,
    ctx: TransformerContext,
  ): Promise<Entity | undefined> => {
    const memberNames: GiteaUser[] = [];

    if (!item.members.pageInfo.hasNextPage) {
      // We got all the members in one go, run the fast path
      for (const user of item.members.nodes) {
        memberNames.push(user);
      }
    } else {
      // There were more than a hundred immediate members - run the slow
      // path of fetching them explicitly
      const { members } = await getTeamMembers(ctx.client, ctx.org, item.slug);
      for (const userLogin of members) {
        memberNames.push(userLogin);
      }
    }

    const team: GiteaTeam = {
      ...item,
      members: memberNames,
    };

    return await teamTransformer(team, ctx);
  };

  const teams = await queryWithPaging(
    client,
    query,
    org,
    r => r.organization?.teams,
    materialisedTeams,
    { org },
  );

  return { teams };
}

export async function getOrganizationTeamsFromUsers(
  client: typeof graphql,
  org: string,
  userLogins: string[],
  teamTransformer: TeamTransformer = defaultOrganizationTeamTransformer,
): Promise<{
  teams: Entity[];
}> {
  const query = `
   query teams($org: String!, $cursor: String, $userLogins: [String!] = "") {
  organization(login: $org) {
    teams(first: 100, after: $cursor, userLogins: $userLogins) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        slug
        combinedSlug
        name
        description
        avatarUrl
        editTeamUrl
        parentTeam {
          slug
        }
        members(first: 100, membership: IMMEDIATE) {
          pageInfo {
            hasNextPage
          }
          nodes {
            avatarUrl,
            bio,
            email,
            login,
            name,
            organizationVerifiedDomainEmails(login: $org)
          }
        }
      }
    }
  }
}`;

  const materialisedTeams = async (
    item: GiteaTeamResponse,
    ctx: TransformerContext,
  ): Promise<Entity | undefined> => {
    const memberNames: GiteaUser[] = [];

    if (!item.members.pageInfo.hasNextPage) {
      // We got all the members in one go, run the fast path
      for (const user of item.members.nodes) {
        memberNames.push(user);
      }
    } else {
      // There were more than a hundred immediate members - run the slow
      // path of fetching them explicitly
      const { members } = await getTeamMembers(ctx.client, ctx.org, item.slug);
      for (const userLogin of members) {
        memberNames.push(userLogin);
      }
    }

    const team: GiteaTeam = {
      ...item,
      members: memberNames,
    };

    return await teamTransformer(team, ctx);
  };

  const teams = await queryWithPaging(
    client,
    query,
    org,
    r => r.organization?.teams,
    materialisedTeams,
    { org, userLogins },
  );

  return { teams };
}

export async function getOrganizationsFromUser(
  client: typeof graphql,
  user: string,
): Promise<{
  orgs: string[];
}> {
  const query = `
  query orgs($user: String!) {
    user(login: $user) {
      organizations(first: 100) {
        nodes { login }
        pageInfo { hasNextPage, endCursor }
      }
    }
  }`;

  const orgs = await queryWithPaging(
    client,
    query,
    '',
    r => r.user?.organizations,
    async o => o.login,
    { user },
  );

  return { orgs };
}

export async function getOrganizationTeam(
  client: typeof graphql,
  org: string,
  teamSlug: string,
  teamTransformer: TeamTransformer = defaultOrganizationTeamTransformer,
): Promise<{
  team: Entity;
}> {
  const query = `
  query teams($org: String!, $teamSlug: String!) {
      organization(login: $org) {
        team(slug:$teamSlug) {
            slug
            combinedSlug
            name
            description
            avatarUrl
            editTeamUrl
            parentTeam { slug }
            members(first: 100, membership: IMMEDIATE) {
              pageInfo { hasNextPage }
              nodes { login }
            }
        }
      }
    }`;

  const materialisedTeam = async (
    item: GiteaTeamResponse,
    ctx: TransformerContext,
  ): Promise<Entity | undefined> => {
    const memberNames: GiteaUser[] = [];

    if (!item.members.pageInfo.hasNextPage) {
      // We got all the members in one go, run the fast path
      for (const user of item.members.nodes) {
        memberNames.push(user);
      }
    } else {
      // There were more than a hundred immediate members - run the slow
      // path of fetching them explicitly
      const { members } = await getTeamMembers(ctx.client, ctx.org, item.slug);
      for (const userLogin of members) {
        memberNames.push(userLogin);
      }
    }

    const team: GiteaTeam = {
      ...item,
      members: memberNames,
    };

    return await teamTransformer(team, ctx);
  };

  const response: QueryResponse = await client(query, {
    org,
    teamSlug,
  });

  if (!response.organization?.team)
    throw new Error(`Found no match for team ${teamSlug}`);

  const team = await materialisedTeam(response.organization?.team, {
    query,
    client,
    org,
  });

  if (!team) throw new Error(`Can't transform for team ${teamSlug}`);

  return { team };
}

export async function getOrganizationRepositories(
  client: typeof graphql,
  org: string,
  catalogPath: string,
): Promise<{ repositories: RepositoryResponse[] }> {
  let relativeCatalogPathRef: string;
  // We must strip the leading slash or the query for objects does not work
  if (catalogPath.startsWith('/')) {
    relativeCatalogPathRef = catalogPath.substring(1);
  } else {
    relativeCatalogPathRef = catalogPath;
  }
  const catalogPathRef = `HEAD:${relativeCatalogPathRef}`;
  const query = `
    query repositories($org: String!, $catalogPathRef: String!, $cursor: String) {
      repositoryOwner(login: $org) {
        login
        repositories(first: 50, after: $cursor) {
          nodes {
            name
            catalogInfoFile: object(expression: $catalogPathRef) {
              __typename
              ... on Blob {
                id
                text
              }
            }
            url
            isArchived
            isFork
            visibility
            repositoryTopics(first: 100) {
              nodes {
                ... on RepositoryTopic {
                  topic {
                    name
                  }
                }
              }
            }
            defaultBranchRef {
              name
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`;

  const repositories = await queryWithPaging(
    client,
    query,
    org,
    r => r.repositoryOwner?.repositories,
    async x => x,
    { org, catalogPathRef },
  );

  return { repositories };
}

export async function getOrganizationRepository(
  client: typeof graphql,
  org: string,
  repoName: string,
  catalogPath: string,
): Promise<RepositoryResponse | null> {
  let relativeCatalogPathRef: string;
  // We must strip the leading slash or the query for objects does not work
  if (catalogPath.startsWith('/')) {
    relativeCatalogPathRef = catalogPath.substring(1);
  } else {
    relativeCatalogPathRef = catalogPath;
  }
  const catalogPathRef = `HEAD:${relativeCatalogPathRef}`;
  const query = `
    query repository($org: String!, $repoName: String!, $catalogPathRef: String!) {
      repositoryOwner(login: $org) {
        repository(name: $repoName) {
          name
          catalogInfoFile: object(expression: $catalogPathRef) {
            __typename
            ... on Blob {
              id
              text
            }
          }
          url
          isArchived
          isFork
          visibility
          repositoryTopics(first: 100) {
            nodes {
              ... on RepositoryTopic {
                topic {
                  name
                }
              }
            }
          }
          defaultBranchRef {
            name
          }
        }
      }
    }`;

  const response: QueryResponse = await client(query, {
    org,
    repoName,
    catalogPathRef,
  });

  return response.repositoryOwner?.repository || null;
}

/**
 * Gets all the users out of a Gitea organization.
 *
 * Note that the users will not have their memberships filled in.
 *
 * @param client - An octokit graphql client
 * @param org - The slug of the org to read
 * @param teamSlug - The slug of the team to read
 */
export async function getTeamMembers(
  client: typeof graphql,
  org: string,
  teamSlug: string,
): Promise<{ members: GiteaUser[] }> {
  const query = `
    query members($org: String!, $teamSlug: String!, $cursor: String) {
      organization(login: $org) {
        team(slug: $teamSlug) {
          members(first: 100, after: $cursor, membership: IMMEDIATE) {
            pageInfo { hasNextPage, endCursor }
            nodes { login }
          }
        }
      }
    }`;

  const members = await queryWithPaging(
    client,
    query,
    org,
    r => r.organization?.team?.members,
    async user => user,
    { org, teamSlug },
  );

  return { members };
}

//
// Helpers
//
export async function query(
  client: AxiosInstance,
  path: string,
) {
  const response = await client.get(path);
  return response.data;
}

export async function query(
  client: AxiosInstance,
  path: string,
) => Promise<Out

/**
 * Assists in repeatedly executing a query with a paged response.
 *
 * Requires that the query accepts a $cursor variable.
 *
 * @param client - The octokit client
 * @param query - The query to execute
 * @param org - The slug of the org to read
 * @param connection - A function that, given the response, picks out the actual
 *                   Connection object that's being iterated
 * @param transformer - A function that, given one of the nodes in the Connection,
 *               returns the model mapped form of it
 * @param variables - The variable values that the query needs, minus the cursor
 */
export async function queryWithPaging<
  GraphqlType,
  OutputType,
  Variables extends {},
  Response = QueryResponse,
>(
  client: typeof graphql,
  query: string,
  org: string,
  connection: (response: Response) => Connection<GraphqlType> | undefined,
  transformer: (
    item: GraphqlType,
    ctx: TransformerContext,
  ) => Promise<OutputType | undefined>,
  variables: Variables,
): Promise<OutputType[]> {
  const result: OutputType[] = [];
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  let cursor: string | undefined = undefined;
  for (let j = 0; j < 1000 /* just for sanity */; ++j) {
    const response: Response = await client(query, {
      ...variables,
      cursor,
    });

    const conn = connection(response);
    if (!conn) {
      throw new Error(`Found no match for ${JSON.stringify(variables)}`);
    }

    for (const node of conn.nodes) {
      const transformedNode = await transformer(node, {
        client,
        query,
        org,
      });

      if (transformedNode) {
        result.push(transformedNode);
      }
    }

    if (!conn.pageInfo.hasNextPage) {
      break;
    } else {
      await sleep(1000);
      cursor = conn.pageInfo.endCursor;
    }
  }

  return result;
}

export type DeferredEntitiesBuilder = (
  org: string,
  entities: Entity[],
) => { added: DeferredEntity[]; removed: DeferredEntity[] };

export const createAddEntitiesOperation =
  (id: string, host: string) => (org: string, entities: Entity[]) => ({
    removed: [],
    added: entities.map(entity => ({
      locationKey: `gitea-org-provider:${id}`,
      entity: withLocations(`https://${host}`, org, entity),
    })),
  });

export const createRemoveEntitiesOperation =
  (id: string, host: string) => (org: string, entities: Entity[]) => ({
    added: [],
    removed: entities.map(entity => ({
      locationKey: `gitea-org-provider:${id}`,
      entity: withLocations(`https://${host}`, org, entity),
    })),
  });

export const createReplaceEntitiesOperation =
  (id: string, host: string) => (org: string, entities: Entity[]) => {
    const entitiesToReplace = entities.map(entity => ({
      locationKey: `gitea-org-provider:${id}`,
      entity: withLocations(`https://${host}`, org, entity),
    }));

    return {
      removed: entitiesToReplace,
      added: entitiesToReplace,
    };
  };
