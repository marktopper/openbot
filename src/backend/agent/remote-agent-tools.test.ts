import type { ConversationMessage, QueueDelivery } from "@openbot/contracts/ipc";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  handleRemoteAgentTool,
  type RemoteAgentTools,
  type RemoteSendApproval,
  type RemoteServerView,
  senderLine,
} from "./remote-agent-tools";

// The send path to another server: what leaves this computer, and what comes back into the model.

const OWNED: RemoteServerView = { id: "server-1", name: "DragonHeart", state: "online", role: "owner" };
const SECRET = "sk-ant-abcdefgh1234";
const SENDER = { agentId: "agent-e", name: "E" };

function fakeTools(options: { deliveries?: QueueDelivery[]; messages?: ConversationMessage[] } = {}) {
  const sent: string[] = [];
  const tools: RemoteAgentTools = {
    listServers: () => [OWNED],
    listAgents: () => Effect.succeed([{ id: "master", name: "Master", title: "", description: "" }]),
    sendMessage: (_serverId, input) => {
      sent.push(input.text);
      return Effect.succeed({ messageId: "sent-1", deliveries: [] });
    },
    listQueue: () => Effect.succeed({ agentId: "master", deliveries: options.deliveries ?? [] }),
    readConversationAround: () =>
      Effect.succeed({
        agentId: "master",
        threadId: "remote-thread",
        activeTurnId: null,
        revision: 1,
        messages: options.messages ?? [],
        references: {},
        pageInfo: { hasOlder: false, olderCursor: null },
      }),
  };
  return { tools, sent };
}

async function run(tools: RemoteAgentTools, tool: string, args: unknown, allow = true) {
  const asked: RemoteSendApproval[] = [];
  const result = await Effect.runPromise(
    handleRemoteAgentTool(tools, {
      tool,
      arguments: args,
      sender: SENDER,
      call: { threadId: "thread-1", turnId: "turn-1", callId: "call-1" },
      approveSend: (send) => {
        asked.push(send);
        return Effect.succeed(allow);
      },
    }),
  );
  return { success: result.success, text: result.contentItems[0]?.text ?? "", asked };
}

describe("remote agent send path", () => {
  it("redacts a secret before the approval card and the send", async () => {
    const { tools, sent } = fakeTools();
    const { asked } = await run(tools, "send_remote_message", {
      serverId: "server-1",
      agentId: "master",
      text: `Use key ${SECRET} for the deploy.`,
    });
    expect(asked[0]?.text).not.toContain(SECRET);
    expect(sent).toHaveLength(1);
    expect(sent[0]).not.toContain(SECRET);
    expect(sent[0]).toContain("[redacted]");
  });

  it("redacts a secret in the answer and the error that come back", async () => {
    const { tools } = fakeTools({
      deliveries: [
        {
          id: "delivery-1",
          messageId: "sent-1",
          recipientAgentId: "master",
          sender: { kind: "user" },
          text: `${senderLine(SENDER)}\n\nDeploy it.`,
          attachments: [],
          replyToMessageId: null,
          status: "failed",
          position: null,
          turnId: "remote-turn",
          error: `Provider refused ${SECRET}`,
          createdAt: "2026-10-20T12:00:00.000Z",
        },
      ],
      messages: [
        {
          id: "answer",
          turnId: "remote-turn",
          author: "assistant",
          status: "completed",
          createdAt: "2026-10-20T12:00:01.000Z",
          text: `The key is ${SECRET}.`,
        },
      ],
    });
    const result = await run(tools, "read_remote_reply", {
      serverId: "server-1",
      agentId: "master",
      messageId: "sent-1",
    });
    expect(result.success).toBe(true);
    expect(result.text).not.toContain(SECRET);
    expect(result.text).toContain("[redacted]");
  });
});
