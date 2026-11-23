import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/", destination: "/overview/dashboard", permanent: false },
      { source: "/dashboard", destination: "/overview/dashboard", permanent: false },
      { source: "/cases", destination: "/market-cases/all-cases", permanent: false },
      { source: "/cases/open", destination: "/market-cases/open-cases", permanent: false },
      { source: "/cases/closed", destination: "/market-cases/closed-cases", permanent: false },
      { source: "/cases/close-1", destination: "/market-cases/close-1-cases", permanent: false },
      { source: "/cases/new", destination: "/market-cases/all-cases/new", permanent: false },
      {
        source: "/cases/:id/edit",
        destination: "/market-cases/all-cases/:id/edit",
        permanent: false,
      },
      { source: "/cases/:id", destination: "/market-cases/all-cases/:id", permanent: false },
      { source: "/search", destination: "/market-cases/search-cases", permanent: false },
      { source: "/import", destination: "/market-cases/import-data", permanent: false },
      {
        source: "/import/batches/:id",
        destination: "/market-cases/import-data/batches/:id",
        permanent: false,
      },
      { source: "/reports", destination: "/market-cases/reporting-export", permanent: false },
      { source: "/unilever", destination: "/unilever/cases", permanent: false },
      { source: "/custom-recordals", destination: "/custom-recordals/records", permanent: false },
      {
        source: "/cmg-references",
        destination: "/reference/cmg-reference-numbers",
        permanent: false,
      },
      { source: "/teams", destination: "/admin/teams", permanent: false },
      { source: "/investigators", destination: "/admin/investigators", permanent: false },
      { source: "/users", destination: "/admin/users", permanent: false },
      { source: "/reference-data", destination: "/admin/master-data", permanent: false },
      { source: "/settings", destination: "/admin/settings", permanent: false },
    ];
  },
};

export default nextConfig;
