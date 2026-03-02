"use client";

import * as React from "react";
import { Box, Button, Container, TextField, Typography, Alert } from "@mui/material";
import { apiFetch, ApiError } from "@/lib/api";
import { setToken, getToken } from "@/lib/auth";
import type { LoginResponse } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("admin@wms.local");
  const [password, setPassword] = React.useState("admin123!");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const t = getToken();
    if (t) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(res.token);
      router.replace("/dashboard");
    } catch (e) {
      const err = e as ApiError;
      setError(err.status ? `${err.status}: ${err.message}` : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        WMS Login
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box component="form" onSubmit={onSubmit} sx={{ display: "grid", gap: 2 }}>
        <TextField
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          fullWidth
        />
        <TextField
          label="Wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          fullWidth
        />
        <Button type="submit" variant="contained" disabled={loading}>
          Inloggen
        </Button>
      </Box>
    </Container>
  );
}