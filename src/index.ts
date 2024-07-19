import { neoSchema } from "./neoSchema.js";

import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { startStandaloneServer } from "@apollo/server/standalone";

import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

interface ApolloServerContext {
  token?: String;
}

const plugins: ApolloServerPlugin<ApolloServerContext>[] = [
  {
    // Fires whenever a GraphQL request is received from a client.
    async requestDidStart(requestContext) {
      console.log(
        "Request started! Query: " + requestContext.request.operationName
      );
    },
    async startupDidFail({ error }) {
      console.error("Startup failed: ", error);
    },

    async contextCreationDidFail({ error }) {
      console.error("Context creation failed: ", error);
    },

    async unexpectedErrorProcessingRequest({ requestContext, error }) {
      console.error("Unexpected error processing request: ", error);
    },

    async invalidRequestWasReceived({ error }) {
      console.error("Invalid request received: ", error);
    },
  },
];

const drainHttpServerPlugin = ApolloServerPluginDrainHttpServer({ httpServer });
plugins.push(drainHttpServerPlugin);

const server = new ApolloServer<ApolloServerContext>({
  schema: await neoSchema.getSchema(),
  plugins: plugins,
});

// Ensure we wait for our server to start
await server.start();

// Set up our Express middleware to handle CORS, body parsing,
// and our expressMiddleware function.
app.use(
  "/api/graphql",
  cors<cors.CorsRequest>(),
  express.json(),
  // expressMiddleware accepts the same arguments:
  // an Apollo Server instance and optional configuration options
  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.authorization }),
  })
);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀  Server ready at path ${PORT}/api/graphql`);
});
