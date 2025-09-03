import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver } from '@nestjs/apollo';

import { join } from 'path';

export const graphqlConfig = {
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  context: ({ req, res }) => ({ req, res }),
  playground: false,
  introspection: true,
  plugins: [ApolloServerPluginLandingPageLocalDefault()],
};
