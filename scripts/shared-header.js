(() => {
  const headerRoot = document.getElementById("sharedHeader");
  if (!headerRoot) return;

  const page = document.body?.dataset?.page || "calendar";
  const isContentPage = /\/content\//i.test(window.location.pathname);

  const menuSections = isContentPage
    ? [
        {
          title: "Torneios",
          links: [
            { key: "calendar", label: "Calendário", href: "../index.html" },
            {
              key: "points-calculator",
              label: "Calculadora de Pontos",
              href: "./points-calculator.html",
            },
            {
              key: "inscricoes",
              label: "Inscrições",
              href: "./inscricoes.html",
            },
          ],
        },
        {
          title: "Jogador",
          links: [
            {
              key: "profile",
              label: "Perfil",
              href: "./profile.html",
            },
            {
              key: "rankings",
              label: "Rankings",
              href: "./rankings.html",
            },
          ],
        },
      ]
    : [
        {
          title: "Torneios",
          links: [
            { key: "calendar", label: "Calendário", href: "./index.html" },
            {
              key: "points-calculator",
              label: "Calculadora de Pontos",
              href: "./content/points-calculator.html",
            },
            {
              key: "inscricoes",
              label: "Inscrições",
              href: "./content/inscricoes.html",
            },
          ],
        },
        {
          title: "Jogador",
          links: [
            {
              key: "profile",
              label: "Perfil",
              href: "./content/profile.html",
            },
            {
              key: "rankings",
              label: "Rankings",
              href: "./content/rankings.html",
            },
          ],
        },
      ];

  const menuHtml = menuSections
    .map((section) => {
      const linksHtml = section.links
        .map((item) => {
          const isActive = item.key === page;
          return `<a class="header-menu-link${isActive ? " active" : ""}" href="${item.href}" ${isActive ? 'aria-current="page"' : ""}>${item.label}</a>`;
        })
        .join("");

      return `
        <div class="header-menu-section">
          <span class="header-menu-section-title">${section.title}</span>
          <div class="header-menu-section-links">${linksHtml}</div>
        </div>
      `;
    })
    .join("");

  headerRoot.innerHTML = `
    <div class="header">
      <div class="header-content">
        <div class="header-text">
          <h1>Padel Portugal</h1>
          <nav class="header-menu" aria-label="Menu principal">${menuHtml}</nav>
        </div>
        <div class="header-year">2026</div>
      </div>
    </div>
  `;

  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <span>Fonte: Calendário de Actividades Provisório 2026 &mdash; Federação Portuguesa de Padel</span>
    <span>Desenvolvido por
      <a href="https://github.com/rferreira98" target="_blank" rel="noopener noreferrer">Ricardo Ferreira</a>
      &amp;
      <a href="https://github.com/joaofpfernandes" target="_blank" rel="noopener noreferrer">Joao Fernandes</a>
    </span>
    <span>
      Queres contribuir? O projeto é open source —
      <a href="https://github.com/joaofpfernandes/portugal_padel_tournaments" target="_blank" rel="noopener noreferrer">contribui no GitHub</a>
    </span>
  `;
  document.body.appendChild(footer);
})();
