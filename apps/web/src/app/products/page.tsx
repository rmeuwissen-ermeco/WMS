"use client";

import * as React from "react";
import { Alert, Button, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { listProducts } from "@/features/products/api";
import { ProductsTable } from "@/features/products/components/ProductsTable";
import type { Product } from "@/features/products/types";
import { toUserMessage } from "@/lib/httpError";

export default function ProductsPage() {
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // simpele debounce zonder dependency
  React.useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listProducts(query);
        if (!alive) return;
        setProducts(res);
      } catch (e) {
        if (!alive) return;
        setError(toUserMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="flex-end">
        <Button variant="contained" onClick={() => router.push("/products/new")}>
          Nieuw product
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <ProductsTable
        products={products}
        query={query}
        onQueryChange={setQuery}
        loading={loading}
      />
    </Stack>
  );
}