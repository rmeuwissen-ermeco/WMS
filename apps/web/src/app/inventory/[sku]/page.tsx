"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Typography,
  Alert,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from "@mui/material";
import { apiFetch, ApiError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";

function coerceParamToString(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

function parseSerials(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const skuRaw = coerceParamToString((params as Record<string, string | string[] | undefined>)["sku"]);
  const sku = decodeURIComponent(skuRaw);

  const action = (searchParams.get("action") ?? "").toLowerCase();
  const mode = (searchParams.get("mode") ?? "").toLowerCase(); // bijv. "serials"

  const [item, setItem] = React.useState<InventoryItem | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Receive dialog state
  const [receiveOpen, setReceiveOpen] = React.useState(false);
  const [receiveSubmitting, setReceiveSubmitting] = React.useState(false);
  const [receiveError, setReceiveError] = React.useState<string | null>(null);

  const [qty, setQty] = React.useState<number>(1);
  const [serialsText, setSerialsText] = React.useState<string>("");

  const serialMode = mode === "serials";

  async function loadItem(skuArg: string) {
    const token = getToken() ?? undefined;
    const res = await apiFetch<InventoryItem>(`/inventory/${encodeURIComponent(skuArg)}`, { token });
    setItem(res);
  }

  React.useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/");
      return;
    }
    if (!sku) return;

    (async () => {
      try {
        setErr(null);
        await loadItem(sku);
      } catch (e) {
        const a = e as ApiError;
        setErr(a.status ? `${a.status}: ${a.message}` : a.message);
      }
    })();
  }, [router, sku]);

  // Auto-open receive dialog if deep-link asks for it
  React.useEffect(() => {
    if (!item) return;
    if (action === "receive") {
      setReceiveOpen(true);

      // In serial-mode: focus op serials, qty volgt uit serials.length
      if (serialMode) {
        // start leeg zodat scanner meteen kan plakken/typen
        setSerialsText("");
        setQty(0);
      } else {
        setQty(1);
      }
    }
  }, [action, serialMode, item]);

  // qty = serials.length als we in serial mode zitten
  React.useEffect(() => {
    if (!serialMode) return;
    const serials = parseSerials(serialsText);
    setQty(serials.length);
  }, [serialMode, serialsText]);

  function closeReceive() {
    setReceiveOpen(false);
    setReceiveSubmitting(false);
    setReceiveError(null);

    // query opruimen (netjes)
    router.replace(`/inventory/${encodeURIComponent(sku)}`);
  }

  async function submitReceive() {
    if (!item) return;

    setReceiveError(null);

    // Basic checks (backend heeft ook zod, maar UX is beter zo)
    if (qty <= 0) {
      setReceiveError("Qty moet groter zijn dan 0.");
      return;
    }

    const serials = serialMode ? parseSerials(serialsText) : [];

    if (serialMode) {
      if (!item.track_serial) {
        setReceiveError("Dit product volgt geen serienummers (track_serial=false).");
        return;
      }
      if (serials.length !== qty) {
        // qty is al serials.length, maar toch safe
        setReceiveError("Aantal serials moet gelijk zijn aan qty.");
        return;
      }
      // duplicates in input blokkeren (backend blokkeert ook)
      const uniq = new Set(serials);
      if (uniq.size !== serials.length) {
        setReceiveError("Er staan dubbele serienummers in je invoer.");
        return;
      }
    }

    setReceiveSubmitting(true);

    try {
      const token = getToken() ?? undefined;

      const body: any = {
        request_id: crypto.randomUUID(),
        sku: item.sku,
        qty,
      };
      if (serialMode) body.serials = serials;

      await apiFetch(`/mutations/receive`, {
        token,
        method: "POST",
        body,
      });

      await loadItem(item.sku);
      closeReceive();
    } catch (e) {
      const a = e as ApiError;
      setReceiveError(a.status ? `${a.status}: ${a.message}` : a.message);
      setReceiveSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Inventory detail</Typography>
        <Button variant="text" onClick={() => router.push("/inventory")}>
          Terug
        </Button>
      </Box>

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}

      {item ? (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6">{item.sku}</Typography>
          <Typography sx={{ opacity: 0.7, mb: 1 }}>{item.name}</Typography>
          <Typography>EAN: {item.ean ?? "-"}</Typography>
          <Typography>Track serial: {item.track_serial ? "yes" : "no"}</Typography>

          <Box sx={{ mt: 2 }}>
            <Typography>On hand: {item.on_hand}</Typography>
            <Typography>Reserved: {item.reserved}</Typography>
            <Typography>
              <b>Available: {item.available}</b>
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => setReceiveOpen(true)}>
              Receive
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {/* RECEIVE DIALOG */}
      <Dialog open={receiveOpen} onClose={closeReceive} fullWidth maxWidth="sm">
        <DialogTitle>
          Receive {serialMode ? "(serials)" : ""}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {receiveError ? <Alert severity="error">{receiveError}</Alert> : null}

            <TextField label="SKU" value={item?.sku ?? ""} disabled />

            <TextField
              label="Qty"
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              disabled={receiveSubmitting || serialMode}
              helperText={serialMode ? "Qty wordt automatisch bepaald door het aantal serials." : ""}
              inputProps={{ min: 1 }}
            />

            {serialMode ? (
              <TextField
                label="Serials (1 per regel)"
                value={serialsText}
                onChange={(e) => setSerialsText(e.target.value)}
                disabled={receiveSubmitting}
                multiline
                minRows={6}
                placeholder="Scan/plak serials, 1 per regel"
              />
            ) : null}

            {serialMode && item && !item.track_serial ? (
              <Alert severity="warning">
                Dit product heeft track_serial=false. Serials ontvangen is niet toegestaan.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeReceive} disabled={receiveSubmitting}>
            Annuleren
          </Button>
          <Button
            variant="contained"
            onClick={submitReceive}
            disabled={receiveSubmitting || (serialMode && !!item && !item.track_serial)}
          >
            Boeken
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}