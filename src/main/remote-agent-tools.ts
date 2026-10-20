import { TEAM_API_ROUTES } from "@openbot/contracts/team-api-routes";
import { Effect } from "effect";
import type { RemoteAgentTools } from "../backend/agent/remote-agent-tools";
import { toToolOperationFailed } from "../backend/agent/tool-operation";
import { decodeAgentSummaries, decodeQueuedMessageReceipt, decodeQueueSnapshot } from "./remote-agent-decoding";
import type { RemoteServerManager } from "./remote-server-manager";

/** One page holds the message and the turn that answered it, also when the agent wrote several steps. */
const ANSWER_PAGE_LIMIT = 50;

type RemoteServers = Pick<RemoteServerManager, "list" | "request" | "readAgentConversationPage">;

/**
 * The agent tools for joined servers. Each call goes through the connection and the sign-in that the
 * app already holds, with the routes that the app itself uses for that server.
 */
export function remoteAgentTools(remoteServers: RemoteServers): RemoteAgentTools {
  return {
    listServers: () =>
      remoteServers
        .list()
        .filter((server) => server.kind === "remote")
        .map((server) => ({ id: server.id, name: server.name, state: server.state, role: server.role })),
    listAgents: (serverId) =>
      remoteServers.request(serverId, TEAM_API_ROUTES.agents.all, decodeAgentSummaries).pipe(
        toToolOperationFailed,
        // A hidden agent takes no new messages, as in list_agents.
        Effect.map((agents) =>
          agents
            .filter((agent) => agent.hiddenAt === undefined)
            .map((agent) => ({ id: agent.id, name: agent.name, title: agent.title, description: agent.description })),
        ),
      ),
    sendMessage: (serverId, input) =>
      remoteServers
        .request(serverId, TEAM_API_ROUTES.agent.messages(input.agentId), decodeQueuedMessageReceipt, {
          method: "POST",
          // The host uses this computer's zone for a routine the agent creates from the message.
          body: { ...input, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        })
        .pipe(toToolOperationFailed),
    listQueue: (serverId, agentId) =>
      remoteServers
        .request(serverId, TEAM_API_ROUTES.agent.queue(agentId), decodeQueueSnapshot)
        .pipe(toToolOperationFailed),
    readConversationAround: (serverId, agentId, messageId) =>
      remoteServers
        .readAgentConversationPage(agentId, { type: "around", messageId }, ANSWER_PAGE_LIMIT, serverId)
        .pipe(toToolOperationFailed),
  };
}
