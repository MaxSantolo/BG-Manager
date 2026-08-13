import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/**
 * A WebSocket-backed Prisma client used ONLY for writes that must be atomic.
 *
 * The app's default client (lib/prisma) uses Neon's HTTP adapter, which is
 * stateless and rejects transactions outright ("Transactions are not supported
 * in HTTP mode"). Interactive transactions need a session, i.e. the WebSocket
 * driver. Rather than move the whole app onto WS pooling (a deliberate
 * serverless trade-off we keep on HTTP), this client is reserved for the game
 * create/update routes, where a mid-sequence failure would otherwise leave a
 * half-written game with mismatched sleeve stock. Everything else stays on HTTP.
 */
neonConfig.webSocketConstructor = ws;

const globalForTx = globalThis as unknown as { prismaTx?: PrismaClient };

function createTxClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter } as never);
}

export const prismaTx = globalForTx.prismaTx ?? createTxClient();

if (process.env.NODE_ENV !== "production") globalForTx.prismaTx = prismaTx;
