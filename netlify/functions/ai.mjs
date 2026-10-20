// Fonction Netlify : garde ta clé API secrète (jamais dans index.html)
// Variable à créer dans Netlify : GEMINI_KEY

export default async (req) => {
  const headers = { "Content-Type": "application/json" };
  const reply = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers });

  if (req.method !== "POST") return reply({ error: "POST uniquement." }, 405);

  try {
    const { topic, style, seconds } = await req.json();
    if (!topic || topic.length > 300) {
      return reply({ error: "Sujet manquant ou trop long." }, 400);
    }

    const nb = seconds >= 30 ? 7 : 5;
    const prompt = `Tu es un expert TikTok francophone. Crée le script d'une vidéo verticale de ${seconds} secondes.
Sujet : ${topic}
Style : ${style}
Réponds UNIQUEMENT avec du JSON valide, sans texte autour, de cette forme :
{"title":"titre court","caption":"légende TikTok","hashtags":["#a","#b","#c","#d","#e"],
"scenes":[{"text":"texte écran, 8 mots max","voice":"phrase dite à voix haute","seconds":4}]}
Règles : exactement ${nb} scènes, la première est un hook très accrocheur, la dernière un appel à l'action, la somme des "seconds" vaut environ ${seconds}.`;

    const model = "gemini-3.1-flash-lite"; // vérifie le nom du modèle gratuit dans Google AI Studio
    const key = Netlify.env.get("GEMINI_KEY");
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return reply({ error: "L'IA n'a rien renvoyé.", detail: data }, 502);

    return new Response(text, { headers });
  } catch (e) {
    return reply({ error: String(e) }, 500);
  }
};
