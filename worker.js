export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-user-id",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // Changement ici : On accepte la racine "/" ou "/generate"
        if ((url.pathname === "/generate" || url.pathname === "/") && request.method === "POST") {
            try {
                const body = await request.json();
                const { prompt, userId, size, nVariants } = body;

                // kie.ai nécessite souvent une structure spécifique
                const response = await fetch("https://api.kie.ai/v1/generate-4o-image", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${env.GPT4O_API_KEY}`,
                    },
                    body: JSON.stringify({
                        prompt: prompt,
                        size: size || "1:1", // Valeur par défaut si absent
                        nVariants: nVariants || 1
                    }),
                });

                const data = await response.json();
                return new Response(JSON.stringify(data), {
                    status: response.status,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: "Erreur lors de l'appel API" }), {
                    status: 500,
                    headers: corsHeaders,
                });
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    },
};
