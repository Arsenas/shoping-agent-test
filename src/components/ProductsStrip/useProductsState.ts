import { useState } from "react";
import type { Product } from "../../screens/ChatScreen";

type Options = {
  onAddToCart?: (title: string, qty: number) => void;
  onShowToast?: (payload: { items: { title: string; qty: number }[] }) => void;
};

export function useProductsState(products: Product[], { onAddToCart, onShowToast }: Options) {
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const changeQty = (id: string, delta: number, product?: Product) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, current + delta);

      if (product) {
        if (current === 0 && delta > 0) {
          onAddToCart?.(product.title, 1);
          onShowToast?.({ items: [{ title: product.title, qty: 1 }] });
        } else if (next > 0) {
          onShowToast?.({ items: [{ title: product.title, qty: next }] });
        } else if (next === 0) {
          onShowToast?.({ items: [{ title: product.title, qty: 0 }] });
        }
      }

      return { ...prev, [id]: next };
    });
  };

  const toggleDislike = (id: string) => {
    setMuted((prev) => {
      const newMuted = !prev[id];
      if (newMuted) {
        setQuantities((q) => ({ ...q, [id]: 0 }));
        setFavorites((f) => ({ ...f, [id]: false }));
      }
      return { ...prev, [id]: newMuted };
    });
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const newFav = !prev[id];
      if (newFav) setMuted((m) => ({ ...m, [id]: false }));
      return { ...prev, [id]: newFav };
    });
  };

  return { muted, favorites, quantities, changeQty, toggleDislike, toggleFavorite };
}
