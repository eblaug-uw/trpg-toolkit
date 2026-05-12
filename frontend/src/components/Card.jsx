import "../style/Card.css";

function Card({ title, onClick }) {
  return (
    <div className="card" onClick={onClick} role={onClick ? "button" : undefined}>
      <h3 className="card-title">{title}</h3>
    </div>
  );
}

export default Card;
