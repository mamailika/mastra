import { verifyJwks } from '@mastra/auth';
import type { JwtPayload } from '@mastra/auth';
import { MastraAuthProvider } from '@mastra/core/server';
import { WorkOS } from '@workos-inc/node';

interface MastraAuthWorkosOptions {
  apiKey?: string;
  clientId?: string;
}

type WorkosUser = JwtPayload;

export class MastraAuthWorkos extends MastraAuthProvider<WorkosUser> {
  protected workos: WorkOS;

  constructor(options?: MastraAuthWorkosOptions) {
    super({ name: 'workos' });

    const apiKey = options?.apiKey ?? process.env.WORKOS_API_KEY;
    const clientId = options?.clientId ?? process.env.WORKOS_CLIENT_ID;

    if (!apiKey || !clientId) {
      throw new Error(
        'WorkOS API key and client ID are required, please provide them in the options or set the environment variables WORKOS_API_KEY and WORKOS_CLIENT_ID',
      );
    }

    this.workos = new WorkOS(apiKey, {
      clientId,
    });
  }

  async authenticateToken(token: string): Promise<WorkosUser | null> {
    const jwksUri = this.workos.userManagement.getJwksUrl(process.env.WORKOS_CLIENT_ID!);
    const user = await verifyJwks(token, jwksUri);
    return user;
  }

  async authorize(path: string, method: string, user: WorkosUser) {
    if (!user) {
      return false;
    }

    const org = await this.workos.userManagement.listOrganizationMemberships({
      userId: user.sub,
    });

    const roles = org.data.map(org => org.role);

    const isAdmin = roles.some(role => role.slug === 'admin');

    return isAdmin;
  }
}
