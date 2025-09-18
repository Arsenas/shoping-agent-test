import "../styles/loading.css";

export function LoadingProducts() {
  return (
    <div className="loading-cards">
      {Array.from({ length: 8 }).map((_, i) => (
        <img
          key={i}
          src="/img/loading-product-card.svg"
          alt="Loading product"
          className="loading-card"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <p className="loading-text">Finding best products for you</p>
    </div>
  );
}
