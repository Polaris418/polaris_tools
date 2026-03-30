package com.polaris.ai.service.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenAiCompatibleHttpSupportTest {

    private final OpenAiCompatibleHttpSupport support = new OpenAiCompatibleHttpSupport();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void 应提取标准Content文本() throws Exception {
        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": "{\\"summary\\":\\"ok\\"}"
                      }
                    }
                  ]
                }
                """;

        assertEquals("{\"summary\":\"ok\"}", support.extractMessageContent(objectMapper.readTree(responseBody)));
    }

    @Test
    void 应兼容Content数组格式() throws Exception {
        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "content": [
                          { "type": "text", "text": "{\\"summary\\":" },
                          { "type": "text", "text": "\\"ok\\"}" }
                        ]
                      }
                    }
                  ]
                }
                """;

        assertEquals("{\"summary\":\"ok\"}", support.extractMessageContent(objectMapper.readTree(responseBody)));
    }

    @Test
    void 应在缺少Content时回退到ReasoningContent中的Json() throws Exception {
        String responseBody = """
                {
                  "choices": [
                    {
                      "message": {
                        "reasoning_content": "先思考一下。最终结果如下：{\\"summary\\":\\"ok\\",\\"documentPatch\\":{}}"
                      }
                    }
                  ]
                }
                """;

        assertEquals("{\"summary\":\"ok\",\"documentPatch\":{}}",
                support.extractMessageContent(objectMapper.readTree(responseBody)));
    }

    @Test
    void 应兼容根节点OutputText() throws Exception {
        String responseBody = """
                {
                  "output_text": "{\\"summary\\":\\"ok\\",\\"documentPatch\\":{}}"
                }
                """;

        assertEquals("{\"summary\":\"ok\",\"documentPatch\":{}}",
                support.extractMessageContent(objectMapper.readTree(responseBody)));
    }
}
