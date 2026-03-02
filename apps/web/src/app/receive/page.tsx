"use client";

import * as React from "react";
import { Box, Button, Container, TextField, Typography, Alert } from "@mui/material";
import { z } from "zod";
import { apiFetch } from "@/lib/api";

const ReceiveSchema = z.object({
  sku: z.string().min(1),
  qty: z.coerce.number().int().positive(),
});

type ReceiveResponse = {
  tx_type: "RECEIVE";
  sku: string;
  qty: number;
  before: { on_hand: number; reserved: number; available: number };
  after: { on_hand: number; reserved: number; available: number };
};

export default function ReceivePage() {
  const [sku, setSku] = React.useState("DEMO-SKU-001");
  const [qty, setQty] = React.useState<number>(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ReceiveResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const parsed = ReceiveSchema.safeParse({ sku, qty });
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(", "));
      return;
    }

    setLoading(true);
    try {
      const request_id = crypto.randomUUID(); // altijd geldige UUID
      const data = await apiFetch<ReceiveResponse>("/mutations/receive", {
        method: "POST",
        body: JSON.stringify({ request_id, sku: parsed.data.sku, qty: parsed.data.qty }),
      });
      setResult(data);
    } catch (err) {
      const e = err as any;
      setError(`${e.message}${e.status ? ` (HTTP ${e.status})` : ""}`);
      // eslint-disable-next-line no-console
      console.error("Receive failed:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Receive
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {result.sku}: {result.before.on_hand} → {result.after.on_hand} (reserved {result.after.reserved})
        </Alert>
      )}

      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2 }}>
        <TextField
          label="SKU / EAN (scan)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          autoFocus
          inputProps={{ inputMode: "text" }}
        />
        <TextField
          label="Qty"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          type="number"
          inputProps={{ min: 1, step: 1 }}
        />
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? "Boeken..." : "Boek ontvangst"}
        </Button>
      </Box>
    </Container>
  );
}