"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, Button, Container, Typography, Paper } from "@mui/material";
import { clearToken, getToken } from "@/lib/auth";

function Tile({ title, href }: { title: string; href: string }) {
  return (
    <Paper
      component={Link as any}
      href={href}
      sx={{
        p: 3,
        textDecoration: "none",
        display: "block",
      }}
    >
      <Typography variant="h6">{title}</Typography>
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        Open
      </Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const router = useRouter();

  React.useEffect(() => {
    const t = getToken();
    if (!t) router.replace("/");
  }, [router]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Button
          variant="outlined"
          onClick={() => {
            clearToken();
            router.replace("/");
          }}
        >
          Uitloggen
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <Tile title="Receive" href="/receive" />
        <Tile title="Reserve / Pick" href="/reserve" />
        <Tile title="Ship" href="/ship" />
        <Tile title="Inventory" href="/inventory" />
      </Box>
    </Container>
  );
}