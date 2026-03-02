"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { z } from "zod";
import { createProductSchema, updateProductSchema } from "../schemas/productSchemas";
import type { CreateProductInput, Product, UpdateProductInput } from "../types";

type CreateProps = {
  mode: "create";
  initial?: undefined;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (data: CreateProductInput) => Promise<void> | void;
};

type EditProps = {
  mode: "edit";
  initial: Product;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (data: UpdateProductInput) => Promise<void> | void;
};

type Props = CreateProps | EditProps;

export function ProductForm(props: Props) {
  const { mode, submitting, error } = props;

  const [sku, setSku] = React.useState(mode === "edit" ? props.initial.sku : "");
  const [name, setName] = React.useState(mode === "edit" ? props.initial.name : "");
  const [ean, setEan] = React.useState(mode === "edit" ? props.initial.ean ?? "" : "");
  const [trackSerial, setTrackSerial] = React.useState(
    mode === "edit" ? props.initial.track_serial : false
  );

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  function applyZodErrors(err: z.ZodError) {
    const fe: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path[0] as string | undefined;
      if (key) fe[key] = issue.message;
    }
    setFieldErrors(fe);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    try {
      if (props.mode === "create") {
        const parsed = createProductSchema.parse({
          sku,
          name,
          ean,
          track_serial: trackSerial,
        });

        await props.onSubmit(parsed);
        return;
      }

      // edit
      const parsed = updateProductSchema.parse({
        name,
        ean,
        track_serial: trackSerial,
      });

      await props.onSubmit(parsed);
    } catch (err) {
      if (err instanceof z.ZodError) {
        applyZodErrors(err);
        return;
      }
      // andere errors laat je parent tonen via `error` prop
      throw err;
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <Typography variant="h6">
          {mode === "create" ? "Nieuw product" : "Product bewerken"}
        </Typography>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {mode === "create" ? (
          <TextField
            label="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            error={Boolean(fieldErrors.sku)}
            helperText={fieldErrors.sku ?? "Uniek. Gebruik bij voorkeur je interne artikelcode."}
            disabled={submitting}
            inputProps={{ autoCapitalize: "none", autoCorrect: "off", spellCheck: false }}
          />
        ) : (
          <TextField label="SKU" value={sku} disabled helperText="SKU kan je niet wijzigen." />
        )}

        <TextField
          label="Naam"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={Boolean(fieldErrors.name)}
          helperText={fieldErrors.name ?? ""}
          disabled={submitting}
        />

        <TextField
          label="EAN"
          value={ean ?? ""}
          onChange={(e) => setEan(e.target.value)}
          error={Boolean(fieldErrors.ean)}
          helperText={fieldErrors.ean ?? "8–14 cijfers of leeg laten."}
          disabled={submitting}
          inputProps={{ inputMode: "numeric" }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={trackSerial}
              onChange={(e) => setTrackSerial(e.target.checked)}
              disabled={submitting}
            />
          }
          label="Serienummers volgen (track_serial)"
        />

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={submitting}>
            {mode === "create" ? "Aanmaken" : "Opslaan"}
          </Button>
        </Stack>

        <Alert severity="info">
          Voorraad blijft ledger-first. Serienummers voeg je toe via Receive mutatie.
        </Alert>
      </Stack>
    </Box>
  );
}