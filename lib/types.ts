export type Item = {
  id: string;
  name: string;
  size: string;
  material: string;
  unit: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type Employee = {
  id: string;
  full_name: string;
  active: boolean;
  created_at: string;
};

export type Project = {
  id: string;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
};

export type StockMovement = {
  id: string;
  type: "in" | "out";
  item_id: string;
  employee_id: string;
  project_id: string | null;
  item_name: string;
  size: string;
  material: string;
  quantity: number;
  unit: string;
  comment: string | null;
  created_at: string;
  items?: Item;
  employees?: Employee;
  projects?: Project | null;
};

export type ToastState = {
  type: "success" | "error";
  message: string;
} | null;
