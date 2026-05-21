import React from "react";

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return <div className="steps">{children}</div>;
}

interface StepProps {
  title: string;
  children: React.ReactNode;
}

export function Step({ title, children }: StepProps) {
  return (
    <div className="step">
      <div className="step-body">
        <div className="step-title">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}
