import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractMessageContent,
  parseJsonFromModel,
  stripReasoningFromSse,
} from "./deepseek";

describe("DeepSeek 解析", () => {
  it("只取 message.content，忽略 reasoning_content", () => {
    const content = extractMessageContent({
      choices: [
        {
          message: {
            content: '{"ok":true}',
            reasoning_content: "我先思考一下……不该出现在 UI",
          },
        },
      ],
    });
    assert.equal(content, '{"ok":true}');
  });

  it("能剥掉 markdown 代码块并解析 JSON", () => {
    const parsed = parseJsonFromModel<{ a: number }>("```json\n{\"a\":1}\n```");
    assert.equal(parsed.a, 1);
  });

  it("能从夹杂文字中抽出 JSON 对象", () => {
    const parsed = parseJsonFromModel<{ x: string }>("前缀 {\"x\":\"hi\"} 后缀");
    assert.equal(parsed.x, "hi");
  });

  it("流式 SSE 会删除 reasoning_content 字段", async () => {
    const payload = [
      "data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"think\"}}]}",
      "data: {\"choices\":[{\"delta\":{\"content\":\"答\"}}]}",
      "data: [DONE]",
      "",
    ].join("\n");
    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    const out = stripReasoningFromSse(input);
    const text = await new Response(out).text();
    assert.equal(text.includes("reasoning_content"), false);
    assert.equal(text.includes("答"), true);
    assert.equal(text.includes("[DONE]"), true);
  });
});

describe("流式观察者（日志用）", () => {
  it("累积正文、finish_reason 与 usage，且不包含 reasoning", async () => {
    const payload = [
      "data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"想\"}}]}",
      "data: {\"choices\":[{\"delta\":{\"content\":\"你\"}}]}",
      "data: {\"choices\":[{\"delta\":{\"content\":\"好\"},\"finish_reason\":\"stop\"}]}",
      "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":2,\"total_tokens\":12,\"prompt_cache_hit_tokens\":4}}",
      "data: [DONE]",
      "",
    ].join("\n");
    const input = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(payload));
        controller.close();
      },
    });
    let text = "";
    let finish = "";
    let usage: Record<string, number> | undefined;
    let ended = false;
    const out = stripReasoningFromSse(input, {
      onChunk(json) {
        text += json.choices?.[0]?.delta?.content ?? "";
        if (json.choices?.[0]?.finish_reason) finish = json.choices[0].finish_reason;
        if (json.usage) usage = json.usage as Record<string, number>;
      },
      onEnd(err) {
        ended = !err;
      },
    });
    await new Response(out).text();
    assert.equal(text, "你好");
    assert.equal(finish, "stop");
    assert.equal(usage?.total_tokens, 12);
    assert.equal(usage?.prompt_cache_hit_tokens, 4);
    assert.equal(ended, true);
  });
});
