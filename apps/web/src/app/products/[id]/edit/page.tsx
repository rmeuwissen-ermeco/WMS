"use client";

import * as React from "react";
import { Alert, Skeleton, Stack } from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { getProduct, updateProduct } from "@/features/products/api";
import { ProductForm } from "@/features/products/components/ProductForm";
import type { Product, UpdateProductInput } from "@/features/products/types";
import { toUserMessage } from "@/lib/httpError";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getProduct(id);
        if (!alive) return;
        setProduct(p);
      } catch (e) {
        if (!alive) return;
        setError(toUserMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  async function onSubmit(data: UpdateProductInput) {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateProduct(id, data);
      setProduct(updated);
      // blijf op pagina, maar je kunt ook terug naar list
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton height={40} />
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </Stack>
    );
  }

  if (error && !product) return <Alert severity="error">{error}</Alert>;
  if (!product) return <Alert severity="error">Product niet gevonden.</Alert>;

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <ProductForm mode="edit" initial={product} submitting={submitting} error={error} onSubmit={onSubmit} />
    </Stack>
  );
}