import React from "react";

export default function PremiumUsername({ name, className = "" }) {
  return (
    <span className={`premium-rainbow ${className}`}>
      {name}
    </span>
  );
}
