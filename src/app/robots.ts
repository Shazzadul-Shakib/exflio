import type { MetadataRoute } from "next";

const baseUrl = "https://extrack.me";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: ["/dashboard", "/wallets", "/transactions", "/debts", "/budgets", "/savings"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
