"use client";

import { useEffect, useRef } from "react";
import { createWidget, type SoriConfig, type SoriInstance } from "@sori/core";

export interface SoriWidgetProps extends SoriConfig {
  /** Called when widget is initialized */
  onInit?: (instance: SoriInstance) => void;
}

export function SoriWidget({ onInit, ...config }: SoriWidgetProps) {
  const instanceRef = useRef<SoriInstance | null>(null);

  useEffect(() => {
    // Create widget
    instanceRef.current = createWidget(config);

    if (onInit && instanceRef.current) {
      onInit(instanceRef.current);
    }

    // Cleanup on unmount
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [config.projectId]); // Only re-create if projectId changes

  // Update config without re-creating
  useEffect(() => {
    if (instanceRef.current) {
      instanceRef.current.setConfig(config);
    }
  }, [config.apiUrl, config.position, config.primaryColor, config.greeting, config.locale]);

  // Render nothing - widget uses shadow DOM
  return null;
}
