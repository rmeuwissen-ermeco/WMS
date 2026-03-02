"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, Button, Container, TextField, Typography, Alert, Paper } from "@mui/material";
import { apiFetch, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";

export default function InventoryPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("DEMO");
  const [items, setItems] = React.useState<InventoryItem[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const t = getToken();
    if (!t) router.replace("/");
  }, [router]);

  async function search() {
    setErr(null);
    setLoading(true);
    try {
      const token = getToken() ?? undefined;
      const res = await apiFetch<InventoryItem[]>(`/inventory?query=${encodeURIComponent(query)}`, { token });
      setItems(res);
    } catch (e) {
      const a = e as ApiError;
      setErr(a.status ? `${a.status}: ${a.message}` : a.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Inventory</Typography>
        <Button variant="text" onClick={() => router.push("/dashboard")}>
          Dashboard
        </Button>
      </Box>

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="Zoek (SKU/EAN/naam)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
            fullWidth
          />
          <Button variant="contained" onClick={search} disabled={loading}>
            Zoeken
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: "grid", gap: 2 }}>
        {items.map((p) => (
          <Paper key={p.id} sx={{ p: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              <Box>
                <Typography variant="h6">{p.sku}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {p.name}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  EAN: {p.ean ?? "-"}
                </Typography>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography>On hand: {p.on_hand}</Typography>
                <Typography>Reserved: {p.reserved}</Typography>
                <Typography>
                  <b>Available: {p.available}</b>
                </Typography>

                <Button
                  component={Link}
                  href={`/inventory/${encodeURIComponent(p.sku)}`}
                  size="small"
                >
                  Detail
                </Button>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    </Container>
  );
}