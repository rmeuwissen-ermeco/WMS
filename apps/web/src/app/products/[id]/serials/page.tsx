"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useParams, useRouter } from "next/navigation";
import { getProduct, listProductSerials } from "@/features/products/api";
import type { Product, SerialNumber } from "@/features/products/types";
import { toUserMessage } from "@/lib/httpError";

export default function ProductSerialsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [product, setProduct] = React.useState<Product | null>(null);
  const [serials, setSerials] = React.useState<SerialNumber[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [filter, setFilter] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const p = await getProduct(id);
        if (!alive) return;
        setProduct(p);

        if (!p.track_serial) {
          setSerials([]);
          return;
        }

        const s = await listProductSerials(id);
        if (!alive) return;
        setSerials(s);
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

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton height={32} />
        <Skeleton height={56} />
        <Skeleton height={180} />
      </Stack>
    );
  }

  if (error && !product) return <Alert severity="error">{error}</Alert>;
  if (!product) return <Alert severity="error">Product niet gevonden.</Alert>;

  if (!product.track_serial) {
    return (
      <Stack spacing={2}>
        <Alert severity="warning">
          Dit product volgt geen serienummers (track_serial = false).
        </Alert>
        <Button variant="outlined" onClick={() => router.push(`/products/${product.id}/edit`)}>
          Naar productinstellingen
        </Button>
      </Stack>
    );
  }

  const filtered = serials.filter((s) => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    return (
      s.serial.toLowerCase().includes(f) ||
      s.status.toLowerCase().includes(f)
    );
  });

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">
          Serials — {product.sku}
        </Typography>

        {/* Serial toevoegen gebeurt via Receive (mutatie), niet rechtstreeks */}
        <Button
          variant="contained"
          onClick={() => router.push(`/inventory/${encodeURIComponent(product.sku)}?action=receive&mode=serials`)}
        >
          Serials ontvangen
        </Button>
      </Stack>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <TextField
        label="Filter"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Zoek op serial of status"
      />

      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 160px 220px",
            gap: 1,
            p: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            fontWeight: 600,
          }}
        >
          <div>Serial</div>
          <div>Status</div>
          <div>Created</div>
        </Box>

        {filtered.map((s) => (
          <Box
            key={s.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 160px 220px",
              gap: 1,
              p: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {s.serial}
            </Typography>
            <div>
              <Chip size="small" label={s.status} />
            </div>
            <Typography variant="body2" color="text.secondary">
              {new Date(s.created_at).toLocaleString("nl-NL")}
            </Typography>
          </Box>
        ))}

        {filtered.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Geen serienummers gevonden.
            </Typography>
          </Box>
        ) : null}
      </Box>

      <Alert severity="info">
        Serienummers voeg je toe via <b>Receive</b> met serials[] gelijk aan qty.
      </Alert>
    </Stack>
  );
}