import { neoSchema } from "./lib/neoSchema.js";
import Logger from "./lib/logger.js";

import { ApolloServer, ApolloServerPlugin } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

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
      Logger.info(
        "Request started! Query: " + requestContext.request.operationName
      );
    },
    async startupDidFail({ error }) {
      Logger.error("Startup failed: ", error);
    },

    async contextCreationDidFail({ error }) {
      Logger.error("Context creation failed: ", error);
    },

    async unexpectedErrorProcessingRequest({ requestContext, error }) {
      Logger.error("Unexpected error processing request: ", error);
    },

    async invalidRequestWasReceived({ error }) {
      Logger.error("Invalid request received: ", error);
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
  Logger.info(`🚀  Server ready at path ${PORT}/api/graphql`);
});
