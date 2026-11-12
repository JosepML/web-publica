"use client";

import { useReducir } from "./hooks";
import { motion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * Transición de página (dirección D · Cristal): la imagen de la tarjeta crece, con sus esquinas
 * redondas, hasta ser la cabecera de la ficha mientras el resto se desenfoca como un cristal.
 * Con "reducir movimiento" (o sin imagen) pasa a un fundido corto.
 */
type Rect = { top: number; left: number; width: number; height: number };

type Viaje = {
  href: string;
  estilo: "cristal" | "fundido";
  fase: "salida" | "esperando" | "llegada";
  imagen?: string;
  rect?: Rect;
  radio: number;
  /** Punto de fijación (object-position) de la imagen en la tarjeta y en la cabecera de la ficha, para que el recorte no salte */
  posOrigen: string;
  posDestino: string;
  /** Zoom y origen del zoom con que se veía la imagen en la tarjeta (p. ej. 1.1 en las diapositivas) */
  escalaOrigen: number;
  origenEscala: string;
};

/** El origen del zoom llega en píxeles; pasado a porcentaje sigue valiendo cuando la imagen cambia de tamaño */
function origenEnPorcentaje(origen: string, r: DOMRect) {
  const [x, y] = origen.split(" ").map(parseFloat);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !r.width || !r.height) return "50% 50%";
  return `${(x / r.width) * 100}% ${(y / r.height) * 100}%`;
}

const Contexto = createContext<(href: string, imagen?: HTMLImageElement | null) => void>(() => {});

export const useTransicion = () => useContext(Contexto);

/** Cabecera de la ficha de proyecto: aquí aterriza la imagen (margen, alto respecto a la pantalla y radio) */
export const CABECERA = { margen: 12, alto: 0.74, radio: 40 };

export function ProveedorTransicion({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reducir = useReducir();
  const [viaje, setViaje] = useState<Viaje | null>(null);
  const rutaSalida = useRef(pathname);

  const ir = useCallback(
    (href: string, imagen?: HTMLImageElement | null) => {
      if (viaje) return;
      rutaSalida.current = pathname;
      const marco = imagen?.closest<HTMLElement>("[data-radio]");
      // El rectángulo es el de la tarjeta (no el de la imagen, que puede ser mayor por su zoom)
      const r = (marco ?? imagen)?.getBoundingClientRect();
      const estilo = imagen ? getComputedStyle(imagen) : null;
      const escalaOrigen = estilo && estilo.transform !== "none" ? new DOMMatrixReadOnly(estilo.transform).a || 1 : 1;
      const radio = marco ? parseFloat(getComputedStyle(marco).borderTopLeftRadius) || 0 : 0;
      const posOrigen = imagen ? getComputedStyle(imagen).objectPosition || "50% 50%" : "50% 50%";
      setViaje({
        href,
        posOrigen,
        escalaOrigen,
        origenEscala: r && estilo ? origenEnPorcentaje(estilo.transformOrigin, r) : "50% 50%",
        posDestino: imagen?.dataset.focoDestino || posOrigen,
        estilo: reducir || !imagen ? "fundido" : "cristal",
        fase: "salida",
        imagen: imagen?.currentSrc || imagen?.src,
        rect: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : undefined,
        radio,
      });
    },
    [pathname, reducir, viaje],
  );

  const salidaTerminada = useCallback(() => {
    setViaje((v) => (v && v.fase === "salida" ? { ...v, fase: "esperando" } : v));
  }, []);

  // Al terminar la salida, navegar
  useEffect(() => {
    if (viaje?.fase === "esperando") router.push(viaje.href);
  }, [viaje, router]);

  // La ruta ya cambió: dejar ver la página nueva
  useEffect(() => {
    if (!viaje || viaje.fase !== "esperando" || pathname === rutaSalida.current) return;
    window.scrollTo(0, 0);
    const t = window.setTimeout(() => setViaje((v) => (v ? { ...v, fase: "llegada" } : v)), 220);
    return () => window.clearTimeout(t);
  }, [pathname, viaje]);

  const fin = useCallback(() => setViaje(null), []);

  return (
    <Contexto.Provider value={ir}>
      {children}
      {viaje && <Capa viaje={viaje} alSalir={salidaTerminada} alLlegar={fin} />}
    </Contexto.Provider>
  );
}

function Capa({ viaje, alSalir, alLlegar }: { viaje: Viaje; alSalir: () => void; alLlegar: () => void }) {
  const llegando = viaje.fase === "llegada";

  if (viaje.estilo === "cristal" && viaje.imagen && viaje.rect) {
    const destino = {
      top: CABECERA.margen,
      left: CABECERA.margen,
      width: document.documentElement.clientWidth - CABECERA.margen * 2,
      height: window.innerHeight * CABECERA.alto - CABECERA.margen,
      borderRadius: CABECERA.radio,
    };
    return (
      <div className="pointer-events-auto fixed inset-0 z-[90]">
        {/* Velo oscuro solo con opacidad: animar un desenfoque a pantalla completa daba tirones */}
        <motion.div
          className="absolute inset-0 bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: llegando ? 0 : 1 }}
          transition={{ duration: llegando ? 0.45 : 0.6 }}
        />
        <motion.div
          className="absolute overflow-hidden shadow-2xl"
          initial={{ ...viaje.rect, borderRadius: viaje.radio, opacity: 1 }}
          animate={llegando ? { ...destino, opacity: 0 } : { ...destino, opacity: 1 }}
          transition={llegando ? { duration: 0.5, ease: "easeOut" } : { duration: 0.85, ease: [0.65, 0, 0.2, 1] }}
          onAnimationComplete={() => (llegando ? alLlegar() : alSalir())}
        >
          {/* Mismo recorte que la tarjeta al salir y que la cabecera al llegar: sin saltos */}
          <motion.img
            src={viaje.imagen}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ transformOrigin: viaje.origenEscala, objectPosition: viaje.posOrigen }}
            initial={{ scale: viaje.escalaOrigen, objectPosition: viaje.posOrigen }}
            animate={{ scale: 1.02, objectPosition: viaje.posDestino }}
            transition={{ duration: 0.85, ease: [0.65, 0, 0.2, 1] }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[90] bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: llegando ? 0 : 1 }}
      transition={{ duration: 0.3 }}
      onAnimationComplete={() => (llegando ? alLlegar() : alSalir())}
    />
  );
}
