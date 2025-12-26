"use client";

import { useEffect, useRef, useCallback } from "react";
import { createWidget, type SoriConfig, type SoriInstance } from "@sori/core";

export function useSori(config: SoriConfig) {
  const instanceRef = useRef<SoriInstance | null>(null);

  useEffect(() => {
    instanceRef.current = createWidget(config);

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [config.projectId]);

  const open = useCallback(() => {
    instanceRef.current?.open();
  }, []);

  const close = useCallback(() => {
    instanceRef.current?.close();
  }, []);

  return { open, close, instance: instanceRef.current };
}
