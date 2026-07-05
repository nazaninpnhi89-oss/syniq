import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "agent-id": string;
          variant?: string;
          "avatar-image-url"?: string;
          "avatar-orb-color-1"?: string;
          "avatar-orb-color-2"?: string;
          "action-text"?: string;
          "start-call-text"?: string;
          "end-call-text"?: string;
          "disable-banner"?: string;
        },
        HTMLElement
      >;
    }
  }
}
