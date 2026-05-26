import React from "react";

interface CardProps {
  title: string;
  icon?: string;
  href?: string;
  children?: React.ReactNode;
}

export default function Card({ title, href, children }: CardProps) {
  const inner = (
    <div className="card">
      <div className="card__header">
        <h3>{title}</h3>
      </div>
      {children && <div className="card__body">{children}</div>}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="card-link">
        {inner}
      </a>
    );
  }
  return inner;
}
