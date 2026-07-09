"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { HOME_PATH } from "@/lib/constants";

const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 60;

// Permite voltar ao menu central deslizando o dedo da direita para a
// esquerda em qualquer ponto da tela, alem do link "Menu" para quem usa
// mouse/teclado ou nao percebe o gesto.
export function BackToMenuBar() {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(event: TouchEvent) {
      const start = touchStart.current;
      touchStart.current = null;

      if (!start) {
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;

      const isRightToLeftSwipe =
        deltaX <= -SWIPE_MIN_DISTANCE_PX &&
        Math.abs(deltaY) < SWIPE_MAX_VERTICAL_DRIFT_PX;

      if (isRightToLeftSwipe) {
        router.push(HOME_PATH);
      }
    }

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [router]);

  return (
    <Link
      href={HOME_PATH}
      className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-900"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
      Menu
    </Link>
  );
}
