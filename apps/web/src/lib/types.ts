export type LoginResponse = {
  token: string;
  user: { id: string; email: string; role: string };
};

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  track_serial: boolean;
  on_hand: number;
  reserved: number;
  available: number;
};

export type MutationResponse = {
  tx_type: "RECEIVE" | "RESERVE" | "SHIP" | "ADJUST";
  sku: string;
  qty: number;
  before: { on_hand: number; reserved: number; available: number };
  after: { on_hand: number; reserved: number; available: number };
};