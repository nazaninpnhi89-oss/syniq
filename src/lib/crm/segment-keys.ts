export const SEGMENT_KEYS = ["stale_leads", "lost_leads", "lost_deals", "won_customers"] as const;
export type SegmentKey = (typeof SEGMENT_KEYS)[number];
