(() => {
  if (window.__beautixMobileWidthGuardLoaded) return;
  window.__beautixMobileWidthGuardLoaded = true;

  const style = document.createElement('style');
  style.id = 'beautix-mobile-width-guard-style';
  style.textContent = `
    html, body {
      width: 100%;
      max-width: 100%;
      overflow-x: clip !important;
    }

    body, #app-view, #report-view, main, .app-shell, .dashboard-shell,
    .dashboard-section, section, article, .card, .grid {
      min-width: 0 !important;
      max-width: 100% !important;
      box-sizing: border-box;
    }

    img, svg, canvas, video, iframe {
      max-width: 100%;
    }

    .table-wrap, .table-container, [class*="table-wrap"], [class*="table-container"] {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: auto !important;
      overscroll-behavior-x: contain;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 720px) {
      body {
        position: relative;
      }

      #app-view, #report-view, main, .app-shell, .dashboard-shell {
        width: 100% !important;
        margin-inline: 0 !important;
      }

      table {
        width: max-content;
        min-width: 100%;
        max-width: none !important;
      }

      th, td {
        max-width: 240px;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      .whatsapp-message-button {
        max-width: 100%;
        flex: 0 0 auto;
      }
    }
  `;
  document.head.appendChild(style);
})();
