// Fonction Netlify : trouve une vidéo de fond gratuite sur Pixabay
// Variable à créer dans Netlify : PIXABAY_KEY (clé gratuite sur pixabay.com/api/docs)

export default async (req) => {
  const url = new URL(req.url);
  const json = (obj, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

  // Mode 2 : on relaie le fichier vidéo (évite les blocages de sécurité du navigateur)
  const proxy = url.searchParams.get("proxy");
  if (proxy) {
    let u;
    try { u = new URL(proxy); } catch { return json({ error: "URL invalide" }, 400); }
    const h = u.hostname;
    const okHost = h === "pixabay.com" || h.endsWith(".pixabay.com") || h === "player.vimeo.com";
    if (u.protocol !== "https:" || !okHost) return json({ error: "Domaine refusé" }, 400);
    const r = await fetch(u.href);
    return new Response(r.body, {
      status: r.status,
      headers: {
        "Content-Type": r.headers.get("content-type") || "video/mp4",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  // Mode 1 : recherche d'une vidéo (les verticales sont préférées)
  const q = url.searchParams.get("q");
  const key = Netlify.env.get("PIXABAY_KEY");
  if (!key) return json({ error: "PIXABAY_KEY manquante" }, 500);
  if (!q) return json({ error: "Mots-clés manquants" }, 400);

  const r = await fetch(
    `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(q)}&per_page=20&safesearch=true`
  );
  const d = await r.json();
  const MAX = 12e6; // 12 Mo maximum pour rester rapide sur téléphone

  const options = [];
  for (const hit of d.hits || []) {
    const files = ["medium", "small", "tiny"]
      .map((k) => hit.videos?.[k])
      .filter((f) => f && f.url && (!f.size || f.size <= MAX))
      .sort((a, b) => b.width - a.width);
    if (files[0]) options.push({ url: files[0].url, portrait: files[0].height > files[0].width });
  }
  if (!options.length) return json({ error: "Aucune vidéo trouvée" }, 404);

  options.sort((a, b) => Number(b.portrait) - Number(a.portrait));
  const pick = options[Math.floor(Math.random() * Math.min(options.length, 5))];
  return json({ url: pick.url });
};
