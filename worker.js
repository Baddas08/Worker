export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-user-id",
        };

        if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

        if ((url.pathname === "/generate" || url.pathname === "/") && request.method === "POST") {
            try {
                const body = await request.json();
                const { prompt, userId, size, nVariants } = body;

                if (!userId) {
                    return new Response(JSON.stringify({ error: "Missing userId" }), { status: 400, headers: corsHeaders });
                }

                // --- LOGIQUE RATE LIMIT (3/JOUR) ---
                const today = new Date().toISOString().split('T')[0];
                const kvKey = `usage:${userId}:${today}`;
                const usageCount = parseInt(await env.VIBEWALL_LIMITS.get(kvKey) || "0");

                if (usageCount >= 3) {
                    return new Response(JSON.stringify({ error: "Limite quotidienne atteinte (3/jour)" }), { 
                        status: 429, 
                        headers: corsHeaders 
                    });
                }

                // --- APPEL API KIE.AI (URL CORRIGÉE) ---
                const response = await fetch("https://api.kie.ai/v1/image/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.GPT4O_API_KEY}`,
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        model: "gpt-4o-image",
                        size: size || "1024x1024",
                        n: nVariants || 1
                    }),
                });

                const data = await response.json();

                if (response.ok) {
                    // Incrémentation seulement si l'image est générée avec succès
                    await env.VIBEWALL_LIMITS.put(kvKey, (usageCount + 1).toString(), { expirationTtl: 86400 });
                }

                return new Response(JSON.stringify(data), {
                    status: response.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });

            } catch (error) {
                return new Response(JSON.stringify({ error: "Internal Server Error", details: error.message }), { 
                    status: 500, 
                    headers: corsHeaders 
                });
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};
