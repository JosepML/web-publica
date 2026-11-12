"use client";

import { useEffect } from "react";

/**
 * Aparición suave de las imágenes: las que terminan de cargar con la página ya abierta salen de negro con un
 * fundido (clase .jm-aparece, en web.css) en lugar de aparecer de golpe. Las que ya estaban cargadas o en
 * caché se ven al instante, sin efecto. Un solo observador para toda la web, sin tocar cada <img>.
 * Se salta cualquier imagen con data-sin-fundido.
 */
export function useAparicionImagenes() {
  useEffect(() => {
    const preparar = (img: HTMLImageElement) => {
      if (img.dataset.jmCarga || img.hasAttribute("data-sin-fundido")) return;
      if (img.complete) return; // ya cargada (caché, o terminada antes de hidratar) o sin src: se ve tal cual
      img.dataset.jmCarga = "espera";
      const fin = (ok: boolean) => {
        img.removeEventListener("load", alCargar);
        img.removeEventListener("error", alFallar);
        if (!ok) {
          delete img.dataset.jmCarga;
          return;
        }
        img.dataset.jmCarga = "listo";
        img.classList.add("jm-aparece");
        img.addEventListener("animationend", () => img.classList.remove("jm-aparece"), { once: true });
      };
      const alCargar = () => fin(true);
      const alFallar = () => fin(false);
      img.addEventListener("load", alCargar);
      img.addEventListener("error", alFallar);
    };
    const revisar = (n: Node) => {
      if (n instanceof HTMLImageElement) preparar(n);
      else if (n instanceof HTMLElement) n.querySelectorAll("img").forEach(preparar);
    };
    revisar(document.body);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") m.addedNodes.forEach(revisar);
        else if (m.target instanceof HTMLImageElement) {
          // Cambio de src (p. ej. un carrusel): se vuelve a evaluar
          const img = m.target;
          if (img.dataset.jmCarga === "listo") delete img.dataset.jmCarga;
          preparar(img);
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset"] });
    return () => obs.disconnect();
  }, []);
}
