/** 雪花 ID 字段：JSON 解析为 number 时会丢精度，须在 parse 前改为字符串。 */
const SNOWFLAKE_ID_FIELDS = new Set([
  'id',
  'dramaId',
  'userId',
  'actorId',
  'actorCollectionId',
  'batchId',
  'tagId',
  'nftId',
]);

/**
 * 将响应 JSON 文本中超长整型 id 字段改为字符串，避免 `JSON.parse` 精度丢失。
 */
export function quoteSnowflakeIdsInJsonText(jsonText: string): string {
  return jsonText.replace(
    /"([^"]+)"\s*:\s*(\d{15,})(?=\s*[,}\]])/g,
    (match, key, digits) => {
      if (!SNOWFLAKE_ID_FIELDS.has(key)) {
        return match;
      }

      return `"${key}":"${digits}"`;
    },
  );
}

export function parseJsonPreservingSnowflakeIds(text: string): unknown {
  return JSON.parse(quoteSnowflakeIdsInJsonText(text));
}
