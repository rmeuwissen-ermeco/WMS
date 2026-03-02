"use client";

import { Container, Typography, Button, Box } from "@mui/material";
import { useRouter } from "next/navigation";

export default function ShipStub() {
  const router = useRouter();
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Ship</Typography>
        <Button variant="text" onClick={() => router.push("/dashboard")}>Dashboard</Button>
      </Box>
      <Typography>Stub. Komt zo.</Typography>
    </Container>
  );
}