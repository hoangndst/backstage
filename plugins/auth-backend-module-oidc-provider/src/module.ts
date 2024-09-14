import { oidcAuthenticator } from '@backstage/plugin-auth-backend-module-oidc-provider';
import {
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';
import { createBackendModule } from '@backstage/backend-plugin-api';
import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';

export const authModuleOidcProvider = createBackendModule({
  pluginId: 'auth',
  moduleId: 'auth.oidc-auth-provider',
  register(reg) {
    reg.registerInit({
      deps: { providers: authProvidersExtensionPoint },
      async init({ providers }) {
        providers.registerProvider({
          providerId: 'oidc-auth-provider',
          factory: createOAuthProviderFactory({
            authenticator: oidcAuthenticator,
            async signInResolver(info, ctx) {
              const userRef = stringifyEntityRef({
                kind: 'User',
                name:
                  info.result.fullProfile.userinfo.preferred_username ||
                  info.result.fullProfile.userinfo.sub,
                namespace: DEFAULT_NAMESPACE,
              });
              return ctx.issueToken({
                claims: {
                  sub: userRef, // The user's own identity
                  ent: [userRef], // A list of identities that the user claims ownership through
                },
              });
            },
          }),
        });
      },
    });
  },
});
