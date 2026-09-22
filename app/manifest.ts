import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Parle avec moi",
    short_name: "Parle",
    description: "Pratique la conversation française à voix haute.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f4ff",
    theme_color: "#4f46e5",
    lang: "fr",
  };
}
