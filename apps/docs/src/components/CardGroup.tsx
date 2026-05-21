import React from "react";

interface CardGroupProps {
  cols?: number;
  children: React.ReactNode;
}

export default function CardGroup({ cols = 2, children }: CardGroupProps) {
  return <div className={`card-grid card-grid-cols-${cols}`}>{children}</div>;
}
