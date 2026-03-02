import { apiFetch } from "@/lib/apiFetch";
import type {
  CreateProductInput,
  Product,
  ProductListResponse,
  SerialNumber,
  UpdateProductInput,
} from "./types";

export async function listProducts(query: string): Promise<ProductListResponse> {
  const qs = new URLSearchParams();
  if (query.trim()) qs.set("query", query.trim());
  return apiFetch(`/products?${qs.toString()}`, { method: "GET" });
}

export async function getProduct(id: string): Promise<Product> {
  return apiFetch(`/products/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  return apiFetch(`/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  return apiFetch(`/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listProductSerials(id: string): Promise<SerialNumber[]> {
  return apiFetch(`/products/${encodeURIComponent(id)}/serials`, {
    method: "GET",
  });
}