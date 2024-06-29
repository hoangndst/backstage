import { createBackend } from '@backstage/backend-defaults';
import {
  gitlabPlugin,
  catalogPluginGitlabFillerProcessorModule,
} from '@immobiliarelabs/backstage-plugin-gitlab-backend';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend/alpha'));
backend.add(import('@backstage/plugin-proxy-backend/alpha'));
backend.add(import('@backstage/plugin-scaffolder-backend/alpha'));
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));

// auth plugin
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-auth-backend-module-gitlab-provider'));
// See https://backstage.io/docs/auth/guest/provider

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend/alpha'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);
backend.add(import('@backstage/plugin-catalog-backend-module-gitlab/alpha'));
backend.add(import('@backstage/plugin-catalog-backend-module-gitlab-org'));

backend.add(import('@backstage/plugin-scaffolder-backend-module-gitlab'));

// search plugin
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-pg/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-catalog/alpha'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs/alpha'));

backend.add(import('@backstage-community/plugin-todo-backend'));

// gitlab plugin
backend.add(gitlabPlugin);
backend.add(catalogPluginGitlabFillerProcessorModule);

// kubernetes plugin
backend.add(import('@backstage/plugin-kubernetes-backend/alpha'));
// s3 plugin
backend.add(import('@spreadshirt/backstage-plugin-s3-viewer-backend'));

backend.add(import('@drodil/backstage-plugin-qeta-backend'));

// rbac plugin
backend.add(import('@janus-idp/backstage-plugin-rbac-backend'));

backend.start();
