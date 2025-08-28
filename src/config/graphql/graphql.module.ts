import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { graphqlConfig } from "./graphql.config";
import { ApolloDriverConfig } from "@nestjs/apollo";



@Module({
    imports: [
        GraphQLModule.forRoot<ApolloDriverConfig>(graphqlConfig)
    ]
})

export class GraphqlModule {}