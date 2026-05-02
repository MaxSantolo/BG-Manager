import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BG Manager",
    short_name: "BG Manager",
    description: "Gestisci la tua collezione di giochi da tavolo",
    start_url: "/collection",
    display: "standalone",
    background_color: "#080d1a",
    theme_color: "#0f1929",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
