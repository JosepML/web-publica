"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Ajustes } from "@/lib/datos/tipos";
import { RUTAS } from "@/lib/rutas";
import { CURVA, CURVA_VIAJE } from "@/styles/movimiento";
import { usePantallaAncha, useReducir } from "../comun/hooks";
import { Icono } from "../Iconos";
import { Pie } from "./Pie";
import { useAparicionImagenes } from "./aparicionImagenes";
import { useAnclas, useScrollMagico } from "./scrollMagico";

/** Menú principal. «Trabajos» primero (plan/contenido/fundamentos.md). Llevan a las secciones de Inicio
 *  mientras no existen sus páginas; las tareas S5 a S9 cambian cada uno a su página al crearla. */
const ENLACES = [
  { nombre: "Trabajos", href: RUTAS.trabajos },
  { nombre: "Servicios", href: "/#servicios" },
  { nombre: "Sobre mí", href: RUTAS.sobreMi },
  { nombre: "Blog", href: RUTAS.blog },
];
const HABLEMOS = RUTAS.contacto;

/** Tema fijo: la web utiliza exclusivamente la dirección visual cinematográfica oscura */
export const useTema = () => ({ tema: "oscuro" as const, cambiarTema: () => {} });

/**
 * Marco de toda la web pública: diseño cinematográfico oscuro predeterminado,
 * fondo con orbes, menú de cristal, foco de luz de las tarjetas, scroll mágico en Inicio y pie.
 */
export function Marco({ ajustes, children }: { ajustes: Ajustes; children: React.ReactNode }) {
  const reducir = useReducir();
  const ruta = usePathname();
  useFoco();
  const ancha = usePantallaAncha();
  // Solo en Inicio y en pantalla de ordenador (en móvil el scroll es siempre 100% nativo)
  useScrollMagico(ancha && ruta === RUTAS.inicio && !reducir);
  useAnclas(ruta);
  useAparicionImagenes();

  return (
    <div data-tema="oscuro" data-reducir={reducir ? "" : undefined} className="jm-raiz relative min-h-svh overflow-x-clip">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[var(--jm-acento)] focus:px-5 focus:py-2.5 focus:text-xs focus:font-semibold focus:text-white"
      >
        Saltar al contenido
      </a>
      <div className="orbes" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <Menu nombre={ajustes.nombre} />
      <div id="contenido-principal" className="relative z-[2]">
        {children}
        <Pie ajustes={ajustes} />
      </div>
    </div>
  );
}

/**
 * Foco de luz en las tarjetas con data-foco: un solo escuchador para toda la página,
 * y como mucho una actualización por fotograma (el ratón da más eventos que fotogramas).
 */
function useFoco() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let actual: HTMLElement | null = null;
    let ultimo: PointerEvent | null = null;
    let pendiente = 0;
    const pintar = () => {
      pendiente = 0;
      const e = ultimo;
      if (!e) return;
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-foco]") ?? null;
      if (actual && actual !== el) actual.style.setProperty("--foco", "0");
      actual = el;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      el.style.setProperty("--foco", "1");
    };
    const mover = (e: PointerEvent) => {
      ultimo = e;
      if (!pendiente) pendiente = requestAnimationFrame(pintar);
    };
    document.addEventListener("pointermove", mover, { passive: true });
    return () => {
      document.removeEventListener("pointermove", mover);
      cancelAnimationFrame(pendiente);
    };
  }, []);
}

/** "Josep Mira Lozano" → "Josep Mira": el nombre corto del menú */
const nombreCorto = (nombre: string) => nombre.split(" ").slice(0, 2).join(" ");

function Menu({ nombre }: { nombre: string }) {
  const reducir = useReducir();
  const { scrollY } = useScroll();
  const [compacto, setCompacto] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const ruta = usePathname();

  useMotionValueEvent(scrollY, "change", (y) => {
    const previo = scrollY.getPrevious() ?? 0;
    setCompacto(y > 40);
    setOculto(!reducir && y > 400 && y > previo + 4 ? true : y < previo - 4 ? false : oculto);
  });

  // Con ratón, llevarlo arriba del todo vuelve a enseñar la barra aunque se haya escondido al bajar
  useEffect(() => {
    const mover = (e: PointerEvent) => e.pointerType === "mouse" && e.clientY < 90 && setOculto(false);
    document.addEventListener("pointermove", mover, { passive: true });
    return () => document.removeEventListener("pointermove", mover);
  }, []);

  // Con el menú móvil abierto la página de detrás no se desplaza
  useEffect(() => {
    if (!abierto) return;
    const previo = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previo;
    };
  }, [abierto]);

  // Al cambiar de página, el menú se cierra
  useEffect(() => setAbierto(false), [ruta]);

  // Con teclado, Escape cierra el menú móvil
  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alTecla);
    return () => document.removeEventListener("keydown", alTecla);
  }, [abierto]);

  return (
    <>
      <motion.header
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4"
        animate={{ y: oculto && !abierto ? -100 : 0 }}
        transition={{ duration: 0.5, ease: CURVA }}
        onFocusCapture={() => setOculto(false)}
      >
        <nav
          aria-label="Principal"
          className={`cristal cristal-fuerte flex w-full max-w-5xl items-center justify-between rounded-full transition-all duration-500 ${
            compacto ? "py-1.5 pl-5 pr-1.5" : "py-2.5 pl-6 pr-2.5"
          }`}
        >
          <Link href={RUTAS.inicio} aria-label={nombreCorto(nombre)} className="flex items-center gap-3 text-[14px] font-semibold tracking-[0.01em]">
            <span
              aria-hidden
              className="relative grid h-[34px] w-[34px] place-items-center rounded-full border-[1.5px] border-[var(--jm-texto)]/55 font-[family-name:var(--font-display-face),'Instrument_Serif',serif] text-[17px] italic font-normal tracking-normal"
            >
              JM
            </span>
            {nombreCorto(nombre)}
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {ENLACES.map((e) => (
              <Link
                key={e.nombre}
                href={e.href}
                className="rounded-full px-4 py-2 text-[13px] font-medium text-[var(--jm-suave)] transition-colors hover:bg-[var(--jm-cristal)] hover:text-[var(--jm-texto)]"
              >
                {e.nombre}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={HABLEMOS} className="boton boton-acento hidden px-5 py-2 text-[13px] sm:inline-flex">
              Hablemos
            </Link>
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-label="Menú"
              aria-expanded={abierto}
              className="flex h-9 w-9 items-center justify-center rounded-full md:hidden"
            >
              <span aria-hidden className="relative block h-5 w-5">
                <span
                  className="absolute left-[3px] right-[3px] top-[7px] h-[1.5px] rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: abierto ? "translateY(3px) rotate(45deg)" : "none" }}
                />
                <span
                  className="absolute left-[3px] right-[3px] top-[12px] h-[1.5px] rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ transform: abierto ? "translateY(-2px) rotate(-45deg)" : "none" }}
                />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {abierto && (
          <>
            <motion.div
              key="velo"
              aria-hidden
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[6px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: CURVA }}
              onClick={() => setAbierto(false)}
            />
            <motion.div
              key="panel"
              className="fixed inset-x-3 top-[76px] z-50 md:hidden"
              initial={{ opacity: 0, y: -10, clipPath: "inset(0 0 100% 0 round 28px)" }}
              animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0 round 28px)" }}
              exit={{ opacity: 0, y: -6, clipPath: "inset(0 0 100% 0 round 28px)", transition: { duration: 0.28, ease: CURVA_VIAJE } }}
              transition={{ duration: 0.6, ease: CURVA }}
            >
              <div className="cristal cristal-fuerte rounded-[28px] px-5 pb-5 pt-2">
                <ul className="flex flex-col">
                  {ENLACES.map((e, i) => {
                    const activo = ruta === e.href || (e.href.length > 1 && !e.href.includes("#") && ruta.startsWith(e.href));
                    return (
                      <motion.li
                        key={e.nombre}
                        className="border-b border-[var(--jm-linea)] last:border-b-0"
                        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.6, ease: CURVA, delay: 0.12 + 0.06 * i }}
                      >
                        <Link
                          href={e.href}
                          onClick={() => setAbierto(false)}
                          className="group flex items-center justify-between py-[15px] text-[26px] font-semibold tracking-[-0.02em] text-[var(--jm-texto)] active:opacity-60"
                        >
                          <span className="flex items-center gap-3">
                            {e.nombre}
                            {activo && <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--jm-acento)]" />}
                          </span>
                          <Icono nombre="flecha" className="h-4 w-4 text-[var(--jm-tenue)] transition-transform duration-300 group-active:translate-x-1" />
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
                <motion.div
                  className="pt-4"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: CURVA, delay: 0.12 + 0.06 * ENLACES.length }}
                >
                  <Link href={HABLEMOS} onClick={() => setAbierto(false)} className="boton boton-acento w-full py-3.5 text-[15px]">
                    Hablemos
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
