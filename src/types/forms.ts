export interface FormState {
  status: "idle" | "error" | "success";
  message: string;
  fields?: Record<string, string>;
}

export const initialFormState: FormState = { status: "idle", message: "" };
