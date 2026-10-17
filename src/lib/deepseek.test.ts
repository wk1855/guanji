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
