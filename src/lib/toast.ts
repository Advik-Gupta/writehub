import { create } from "zustand";

export const useToast = create<{ message: string | null; id: number }>(() => ({ message: null, id: 0 }));

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(message: string) {
  clearTimeout(timer);
  useToast.setState((s) => ({ message, id: s.id + 1 }));
  timer = setTimeout(() => useToast.setState({ message: null }), 2600);
}
