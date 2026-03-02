"use client";

import * as React from "react";
import { Alert, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { createProduct } from "@/features/products/api";
import { ProductForm } from "@/features/products/components/ProductForm";
import type { CreateProductInput } from "@/features/products/types";
import { toUserMessage } from "@/lib/httpError";

export default function NewProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(data: CreateProductInput) {
    setSubmitting(true);
    setError(null);
    try {
      const created = await createProduct(data);
      router.push(`/products/${created.id}/edit`);
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Stack spacing={2}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <ProductForm mode="create" submitting={submitting} error={error} onSubmit={onSubmit} />
    </Stack>
  );
}