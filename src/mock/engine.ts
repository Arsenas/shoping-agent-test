import type { Msg } from "../types";
import { MOCK_PRODUCTS } from "./products";

type Category = import("../types").Category;
type Collected = import("../types").Collected;

type Deps = {
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>;
  setCollected: React.Dispatch<React.SetStateAction<Collected>>;
  getProducts?: () => typeof MOCK_PRODUCTS;
  delayMs?: number; // default 900ms
};

const processedLoaderIds = new Set<string>();
const pendingQueries = new Map<string, string>();

export const uid = () => Math.random().toString(36).slice(2);

export function sentenceFor(c: Category) {
  return c;
}

export function createMockEngine({ setMessages, getProducts, delayMs = 900 }: Deps) {
  const products = () => (getProducts ? getProducts() : MOCK_PRODUCTS);

  function send(text: string, opts?: { source?: "chat" | "voice" }) {
    const q = text.trim();
    if (!q) return;

    const userMsg: Msg = { id: uid(), role: "user", kind: "text", text: q };
    const loaderId = uid(); // 👈 deklaruojam prieš if

    // 👉 voice atveju dabar veikia taip pat kaip chat
    if (opts?.source === "voice") {
      setMessages((prev) => [...prev, userMsg, { id: loaderId, role: "system", kind: "loading" } as Msg]);
      pendingQueries.set(loaderId, q);
      return;
    }

    // 👉 chat atveju appendinam su loader
    setMessages((prev) => [...prev, userMsg, { id: loaderId, role: "system", kind: "loading" } as Msg]);

    pendingQueries.set(loaderId, q);
  }

  function handleMessagesEffect(messages: Msg[]) {
    let loader: Msg | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.kind === "loading") {
        loader = m;
        break;
      }
    }
    if (!loader) return;
    if (processedLoaderIds.has(loader.id)) return;

    processedLoaderIds.add(loader.id);
    const q = (pendingQueries.get(loader.id) ?? "").toLowerCase();

    const t = setTimeout(() => {
      pendingQueries.delete(loader!.id);

      let scenario: string;
      if (q.includes("none")) scenario = "none";
      else if (q.includes("alternative")) scenario = "alternative";
      else if (q.includes("many")) scenario = "many";
      else if (q.includes("one")) scenario = "one";
      else if (q.includes("more")) scenario = "more";
      else if (q.includes("feedback")) scenario = "feedback";
      else if (q.includes("connection")) scenario = "connection";
      else if (q.includes("error")) scenario = "error";
      else scenario = "default";

      if (scenario === "one") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-one",
                role: "assistant",
                kind: "products",
                products: [products()[0]],
                header: "Based on your request, this is the single best match we recommend:",
              } as Msg,
            ])
        );
      } else if (scenario === "many") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-many",
                role: "assistant",
                kind: "products",
                products: products(),
                header: "We found multiple products that match your request. Here they are:",
                footer: "Do you need any further help?",
                visibleCount: 3,
                showMore: false,
              } as Msg,
            ])
        );
      } else if (scenario === "alternative") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-alternative",
                role: "assistant",
                kind: "products",
                products: products().slice(3, 6),
                header: `I couldn’t find anything for "${q}", but here are the closest matches that our customers love:`,
                footer: "Do you need any further help?",
                visibleCount: 3,
                showMore: false,
              } as Msg,
            ])
        );
      } else if (scenario === "more") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-more",
                role: "assistant",
                kind: "products",
                products: products(),
                header: "Based on your request we have found a lot of products matching your description:",
                visibleCount: 3,
                showMore: true,
              } as Msg,
            ])
        );
      } else if (scenario === "none") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-none",
                role: "assistant",
                kind: "text",
                text: `No results found for "${q}". I suggest checking these items:`,
                extraClass: "no-results",
              } as Msg,
              {
                id: loader!.id + "-actions",
                role: "assistant",
                kind: "actions",
                actions: [
                  { label: "Recommendation 1", value: "rec1" },
                  { label: "Recommendation 2", value: "rec2" },
                ],
                extraClass: "recommendation-chips",
              } as Msg,
              {
                id: loader!.id + "-support",
                role: "assistant",
                kind: "text",
                text: "If you need immediate help, call us (+3706 465 8132) or send us an email (info@shop.lt).",
                extraClass: "support-text",
              } as Msg,
            ])
        );
      } else if (scenario === "feedback") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-feedback",
                role: "assistant",
                kind: "feedback",
              } as Msg,
            ])
        );
      } else if (scenario === "connection") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-connection",
                role: "assistant",
                kind: "connection-lost",
              } as Msg,
            ])
        );
      } else if (scenario === "error") {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-error",
                role: "assistant",
                kind: "error",
                text: "This is an error message that will be displayed when there's an error.",
              } as Msg,
            ])
        );
      } else {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== loader!.id)
            .concat([
              {
                id: loader!.id + "-default",
                role: "assistant",
                kind: "text",
                text:
                  "This is a default text message, to test different outcomes use the following keywords listed below:\n" +
                  "- type 'one' → one product\n" +
                  "- type 'many' → many products\n" +
                  "- type 'more' → products with Show more button\n" +
                  "- type 'none' → no results + recommendations\n" +
                  "- type 'alternative' → alternative UI (3 different products)\n" +
                  "- type 'feedback' → feedback screen\n" +
                  "- type 'connection' → connection lost screen\n" +
                  "- type 'error' → error message",
              } as Msg,
            ])
        );
      }
    }, delayMs);

    return () => clearTimeout(t);
  }

  return { send, handleMessagesEffect };
}
