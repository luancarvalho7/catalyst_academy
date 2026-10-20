import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/home",
    name: "Catalyst Academy",
    short_name: "Catalyst",
    description: "Interactive, bite-sized lessons on prediction markets. Practice with simulated money before you risk a cent.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#010304",
    theme_color: "#010304",
    categories: ["education", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
