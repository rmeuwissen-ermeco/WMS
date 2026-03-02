"use client";

import * as React from "react";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import NumbersIcon from "@mui/icons-material/Numbers";
import { useRouter } from "next/navigation";
import type { Product } from "../types";

type Props = {
  products: Product[];
  query: string;
  onQueryChange: (v: string) => void;
  loading?: boolean;
};

export function ProductsTable({ products, query, onQueryChange, loading }: Props) {
  const router = useRouter();

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Producten</Typography>
      </Stack>

      <TextField
        label="Zoeken"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Zoek op SKU, naam of EAN"
        disabled={loading}
      />

      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "160px 1fr 160px 160px 110px",
            gap: 1,
            p: 1.5,
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
            fontWeight: 600,
          }}
        >
          <div>SKU</div>
          <div>Naam</div>
          <div>EAN</div>
          <div>Serienummers</div>
          <div>Acties</div>
        </Box>

        {products.map((p) => (
          <Box
            key={p.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "160px 1fr 160px 160px 110px",
              gap: 1,
              p: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {p.sku}
            </Typography>
            <Typography variant="body2">{p.name}</Typography>
            <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
              {p.ean ?? "—"}
            </Typography>
            <div>
              {p.track_serial ? <Chip size="small" label="TRACKED" /> : <Chip size="small" label="OFF" />}
            </div>
            <div>
              <IconButton
                size="small"
                aria-label="Edit"
                onClick={() => router.push(`/products/${p.id}/edit`)}
              >
                <EditIcon fontSize="small" />
              </IconButton>

              <IconButton
                size="small"
                aria-label="Serials"
                onClick={() => router.push(`/products/${p.id}/serials`)}
                disabled={!p.track_serial}
              >
                <NumbersIcon fontSize="small" />
              </IconButton>
            </div>
          </Box>
        ))}

        {products.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Geen producten gevonden.
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Stack>
  );
}