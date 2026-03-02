export type Product = {
  id: string;
  sku: string;
  name: string;
  ean: string | null;
  track_serial: boolean;
};

export type ProductListResponse = Product[];

export type CreateProductInput = {
  sku: string;
  name: string;
  ean?: string | null;
  track_serial: boolean;
};

export type UpdateProductInput = {
  name?: string;
  ean?: string | null;
  track_serial?: boolean;
};

export type SerialNumber = {
  id: string;
  product_id: string;
  serial: string;
  status: string; // bijv. AVAILABLE / RESERVED / SHIPPED (afhankelijk van backend)
  created_at: string;
};