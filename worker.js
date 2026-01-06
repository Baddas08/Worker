/**
 * VibeWall Proxy - Cloudflare Worker
 * Protecting API Keys and managing rate limits
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-user-id",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // Endpoint: /generate
        if (url.pathname === "/generate" && request.method === "POST") {
            const { prompt, userId } = await request.json();

            if (!userId) {
                return new Response("Missing userId", { status: 400, headers: corsHeaders });
            }

            // Simple rate limiting using KV (if available) or a simplified check
            // For this demonstration, we'll assume the client handles the 3/day count
            // but in production, you should use env.KV_NAMESPACE to track usage.

            try {
                const response = await fetch("https://api.kie.ai/v1/generate-4o-image", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.GPT4O_API_KEY}`,
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        // Add other required parameters according to kie.ai docs
                    }),
                });

                const data = await response.json();
                return new Response(JSON.stringify(data), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (error) {
                // Fallback to QWEN if primary fails
                try {
                    const response = await fetch("https://api.qwen.ai/v1/image/generate", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${env.QWEN_API_KEY}`,
                        },
                        body: JSON.stringify({
                            prompt: prompt,
                            // ID: env.QWEN_ID
                        }),
                    });
                    const data = await response.json();
                    return new Response(JSON.stringify(data), {
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    });
                } catch (fallbackError) {
                    return new Response(JSON.stringify({ error: "All APIs failed" }), {
                        status: 500,
                        headers: corsHeaders,
                    });
                }
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};
