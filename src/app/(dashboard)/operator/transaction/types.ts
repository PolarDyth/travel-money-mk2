import { Database } from "@/types/database";
import { TransactionDraft } from "./schemas";

export type Currency = Database["public"]["Tables"]["currencies"]["Row"];
export type ExchangeRate = Database["public"]["Tables"]["exchange_rates"]["Row"];
export type Denomination = Database["public"]["Tables"]["currency_denominations"]["Row"];

export type TransactionUpdateHandler = (updates: Partial<TransactionDraft>) => void;

