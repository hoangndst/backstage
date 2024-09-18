/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Entity, GroupEntity, UserEntity } from '@backstage/catalog-model';
import { AxiosInstance } from 'axios';
import {
  ANNOTATION_GITHUB_TEAM_SLUG,
  ANNOTATION_GITHUB_USER_LOGIN,
} from './annotation';
import { GiteaOrganization, GiteaUser } from './gitea';

/**
 * Context passed to Transformers
 *
 * @public
 */
export interface TransformerContext {
  client: AxiosInstance;
  org: string;
}

/**
 * Transformer for Gitea users to an Entity
 *
 * @public
 */
export type UserTransformer = (
  item: GiteaUser,
  ctx: TransformerContext,
) => Promise<Entity | undefined>;

/**
 * Transformer for Gitea Organization to an Entity
 *
 * @public
 */
export type OrganizationTransformer = (
  item: GiteaOrganization,
  ctx: TransformerContext,
) => Promise<Entity | undefined>;

/**
 * Default transformer for Gitea users to UserEntity
 *
 * @public
 */
export const defaultUserTransformer = async (
  item: GiteaUser,
  _ctx: TransformerContext,
): Promise<UserEntity | undefined> => {
  const entity: UserEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'User',
    metadata: {
      name: item.username,
      annotations: {
        [ANNOTATION_GITHUB_USER_LOGIN]: item.html_url,
      },
    },
    spec: {
      profile: {},
      memberOf: [],
    },
  };

  if (item.description) entity.metadata.description = item.description;
  if (item.full_name) entity.spec.profile!.displayName = item.full_name;
  if (item.email) entity.spec.profile!.email = item.email;
  if (item.avatar_url) entity.spec.profile!.picture = item.avatar_url;
  return entity;
};

/**
 * Default transformer for Gitea Organization to GroupEntity
 *
 * @public
 */
export const defaultOrganizationTransformer: OrganizationTransformer =
  async org => {
    const annotations: { [annotationName: string]: string } = {
      [ANNOTATION_GITHUB_TEAM_SLUG]: org.full_path,
    };

    if (org.edit_url) {
      annotations['backstage.io/edit-url'] = org.edit_url;
    }

    const entity: GroupEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Group',
      metadata: {
        name: org.name,
        annotations,
      },
      spec: {
        type: 'org',
        profile: {},
        children: [],
      },
    };

    if (org.description) {
      entity.metadata.description = org.description;
    }
    if (org.full_name) {
      entity.spec.profile!.displayName = org.full_name;
    }
    if (org.avatar_url) {
      entity.spec.profile!.picture = org.avatar_url;
    }

    entity.spec.members = org.members.map(user => user.username);

    return entity;
  };
