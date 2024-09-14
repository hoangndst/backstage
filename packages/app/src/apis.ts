import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  ApiRef,
  OpenIdConnectApi,
  ProfileInfoApi,
  BackstageIdentityApi,
  SessionApi,
  createApiRef,
  discoveryApiRef,
  oauthRequestApiRef
} from '@backstage/core-plugin-api';
import { OAuth2 } from '@backstage/core-app-api';

export const oidcAuthRef: ApiRef<
  OpenIdConnectApi & ProfileInfoApi & BackstageIdentityApi & SessionApi
> = createApiRef({
  id: 'auth.oidc-auth-provider',
});

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: oidcAuthRef,
    deps: {
      discoveryApi: discoveryApiRef,
      oauthRequestApi: oauthRequestApiRef,
      configApi: configApiRef,
    },
    factory: ({ discoveryApi, oauthRequestApi, configApi }) => OAuth2.create({
      configApi,
      discoveryApi,
      oauthRequestApi,
      provider: {
        id: 'oidc-auth-provider',
        title: 'OIDC auth provider',
        icon: () => null,
      },
      environment: configApi.getOptionalString('auth.environment'),
      defaultScopes: ['openid', 'profile', 'email'],
      popupOptions: {
        // optional, used to customize login in popup size
        size: {
          fullscreen: true,
        },
        /**
         * or specify popup width and height
         * size: {
            width: 1000,
            height: 1000,
          }
         */
      },
    }),
  }),
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
];
