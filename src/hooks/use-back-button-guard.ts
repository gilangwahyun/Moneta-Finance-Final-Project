//********** START: useBackButtonGuard **********
//********** Bug 2 Fix: Aligned with standard sequential web history (Pinterest PWA
//********** pattern). The back button now navigates naturally through Next.js router
//********** history. Only when the user reaches the root view with no more internal
//********** pages to go back to, the guard intercepts and shows the exit dialog.
//**********
//********** Key change from previous version:
//**********   - Removed aggressive pushState dummy that prevented ALL back navigation
//**********   - Now pushes ONE dummy state only at the root route (/ or /dashboard)
//**********   - Inner-page presses navigate naturally (no interception)
//**********   - Root-page presses show exit confirm, then use graceful OS exit
//********** END: useBackButtonGuard **********

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

//********** Root paths that trigger the exit guard (not internal app routes)
const ROOT_PATHS = new Set(["/", "/dashboard"]);

//********** HOOK **********
export function useBackButtonGuard() {
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pathname = usePathname();
  const handlerRef = useRef<((e: PopStateEvent) => void) | null>(null);
  const isExitingRef = useRef(false);
  //********** Track whether dummy guard state is currently pushed
  const guardPushedRef = useRef(false);

  useEffect(() => {
    //********** Only activate in PWA standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as Navigator & { standalone?: boolean })
          .standalone === true);

    if (!isStandalone) return;

    const isAtRoot = ROOT_PATHS.has(pathname);

    //********** Remove any previously registered handler before re-registering
    if (handlerRef.current) {
      window.removeEventListener("popstate", handlerRef.current);
      handlerRef.current = null;
    }

    if (!isAtRoot) {
      //********** Inner page: do NOT push a guard state
      //********** Let the browser handle back navigation naturally.
      //********** This is the Pinterest pattern: back goes to the previous page.
      guardPushedRef.current = false;
      return;
    }

    //********** Root page: push ONE dummy guard state
    //********** This ensures pressing back fires popstate instead of exiting directly.
    if (!guardPushedRef.current) {
      history.pushState({ pwaGuard: true }, "");
      guardPushedRef.current = true;
    }

    const handlePopState = (e: PopStateEvent) => {
      if (isExitingRef.current) return;

      //********** Only intercept when we're still on the root path
      if (!ROOT_PATHS.has(window.location.pathname)) {
        //********** Not at root - the navigation already happened, nothing to do
        return;
      }

      //********** Re-push to keep the guard active for the next press
      history.pushState({ pwaGuard: true }, "");
      setShowExitConfirm(true);
    };

    handlerRef.current = handlePopState;
    window.addEventListener("popstate", handlePopState);

    return () => {
      if (handlerRef.current) {
        window.removeEventListener("popstate", handlerRef.current);
        handlerRef.current = null;
      }
    };
  }, [pathname]);

  const confirmExit = useCallback(() => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;

    //********** Remove listener before navigating to prevent re-trigger
    if (handlerRef.current) {
      window.removeEventListener("popstate", handlerRef.current);
      handlerRef.current = null;
    }
    guardPushedRef.current = false;
    setShowExitConfirm(false);

    //********** Step 1: Try standard PWA close
    window.close();

    //********** Step 2: Graceful fallback - navigate back past all entries.
    //********** The OS standalone container treats this as "closed".
    setTimeout(() => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
      if (isStandalone) {
        //********** Navigate back past all history so the OS container minimizes/closes
        const steps = window.history.length;
        if (steps > 1) {
          window.history.go(-steps);
        } else {
          //********** Only one entry - replace with a neutral state
          window.history.replaceState(null, "", "/");
          window.history.go(-1);
        }
      } else {
        window.history.go(-window.history.length);
      }
    }, 200);
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    isExitingRef.current = false;
    //********** Guard state was already re-pushed by handlePopState
  }, []);

  return { showExitConfirm, confirmExit, cancelExit };
}
