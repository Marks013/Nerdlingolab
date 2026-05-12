"use client";

import { useEffect } from "react";

type LoyaltyEventName =
  | "loyalty_campaign_viewed"
  | "loyalty_coupon_generated"
  | "loyalty_coupon_generated_viewed"
  | "loyalty_points_previewed"
  | "loyalty_referral_link_shared"
  | "loyalty_wallet_viewed";

interface LoyaltyTrackerProps {
  eventName: LoyaltyEventName;
  properties?: Record<string, number | string | boolean | null | undefined>;
}

export function LoyaltyTracker({ eventName, properties = {} }: LoyaltyTrackerProps): null {
  const serializedProperties = JSON.stringify(properties);

  useEffect(() => {
    trackLoyaltyEvent(eventName, JSON.parse(serializedProperties) as LoyaltyTrackerProps["properties"]);
  }, [eventName, serializedProperties]);

  return null;
}

export function trackLoyaltyEvent(eventName: LoyaltyEventName, properties: LoyaltyTrackerProps["properties"] = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = compactProperties(properties);
  const browserWindow = window as typeof window & {
    dataLayer?: unknown[];
    gtag?: (command: string, eventName: string, properties?: Record<string, unknown>) => void;
    posthog?: {
      capture?: (eventName: string, properties?: Record<string, unknown>) => void;
    };
  };

  browserWindow.dataLayer?.push({ event: eventName, ...payload });
  browserWindow.gtag?.("event", eventName, payload);
  browserWindow.posthog?.capture?.(eventName, payload);
  window.dispatchEvent(new CustomEvent("nerdlingolab:analytics", {
    detail: {
      eventName,
      properties: payload
    }
  }));
}

function compactProperties(properties: LoyaltyTrackerProps["properties"]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(properties ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
}
