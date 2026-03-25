(() => {
  const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";

  const PAGE_META = {
    calendar: {
      title: "Calendário Padel 2026 - FPP",
      description:
        "Calendário de torneios de padel em Portugal com pesquisa, filtros e mapa interativo.",
    },
    "points-calculator": {
      title: "Calculadora de Pontos - Padel Portugal",
      description:
        "Calculadora de pontos de padel por nível de torneio e fase, com tabela de referência atualizada.",
    },
    rankings: {
      title: "Rankings Absolutos - Padel Portugal",
      description:
        "Consulta os rankings absolutos masculino e feminino de padel em Portugal com pesquisa e filtros por nível, escalão e clube.",
    },
  };

  const FALLBACK_META = {
    title: "Padel Portugal",
    description: "Informação de padel em Portugal.",
  };

  const normalizePath = () => String(window.location.pathname || "").toLowerCase();

  const detectPageKey = () => {
    const bodyPage = document.body?.dataset?.page;
    if (bodyPage && PAGE_META[bodyPage]) return bodyPage;

    const path = normalizePath();
    if (path.includes("/content/rankings.html")) return "rankings";
    if (path.includes("/content/points-calculator.html")) return "points-calculator";
    if (path.endsWith("/index.html") || path === "/" || path === "") return "calendar";

    return null;
  };

  const getSocialImagePath = () => {
    const path = normalizePath();
    return path.includes("/content/") ? "../assets/social.png" : "./assets/social.png";
  };

  const upsertMetaByName = (name, content) => {
    if (!name) return;
    let node = document.head.querySelector(`meta[name=\"${name}\"]`);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute("name", name);
      document.head.appendChild(node);
    }
    node.setAttribute("content", content);
  };

  const upsertMetaByProperty = (property, content) => {
    if (!property) return;
    let node = document.head.querySelector(`meta[property=\"${property}\"]`);
    if (!node) {
      node = document.createElement("meta");
      node.setAttribute("property", property);
      document.head.appendChild(node);
    }
    node.setAttribute("content", content);
  };

  const applyAnalytics = () => {
    const isPlaceholderId = GA_MEASUREMENT_ID === "G-EP6YKEGNPL";
    if (!GA_MEASUREMENT_ID || isPlaceholderId || typeof window.gtag === "function") {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: window.location.pathname,
    });
  };

  const applySocialMeta = () => {
    const pageKey = detectPageKey();
    const pageMeta = PAGE_META[pageKey] || FALLBACK_META;
    const imagePath = getSocialImagePath();

    if (pageMeta.title) {
      document.title = pageMeta.title;
    }

    upsertMetaByName("description", pageMeta.description);

    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:title", pageMeta.title);
    upsertMetaByProperty("og:description", pageMeta.description);
    upsertMetaByProperty("og:image", imagePath);
    upsertMetaByProperty("og:image:alt", pageMeta.title);

    upsertMetaByName("twitter:card", "summary_large_image");
    upsertMetaByName("twitter:title", pageMeta.title);
    upsertMetaByName("twitter:description", pageMeta.description);
    upsertMetaByName("twitter:image", imagePath);
  };

  applyAnalytics();
  applySocialMeta();
})();
