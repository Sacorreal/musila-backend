import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { ApolloDriver } from "@nestjs/apollo";

import { join } from "path";


export const graphqlConfig = {
    driver: ApolloDriver,
    autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    playground: false,
    introspection: true,
    plugins: [ApolloServerPluginLandingPageLocalDefault()]
}