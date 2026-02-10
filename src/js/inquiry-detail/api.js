// PTPM — Inquiry Detail GraphQL API Helper
// Provides graphqlRequest() using credentials from the config bridge.
// Depends on: bridge.js (sets window.GRAPHQL_ENDPOINT, window.GRAPHQL_API_KEY)
async function graphqlRequest(query, variables = {}) {
  const response = await fetch(window.GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": window.GRAPHQL_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.message ||
      payload?.message ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    throw new Error(payload.errors[0]?.message || "GraphQL error");
  }
  return payload?.data ?? null;
}
