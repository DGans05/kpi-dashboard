import { AuthConfig } from 'convex/server';

// Convex Auth (Password provider) uses JWT_PRIVATE_KEY / JWKS in Convex env.
// No custom JWT providers (e.g. WorkOS) needed.
export default {
  providers: [],
} satisfies AuthConfig;
