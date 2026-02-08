import React from "react";
import { clsx } from "clsx";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  displayValue?: string;
  className?: string;
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  displayValue,
  className,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={clsx("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-400">{label}</label>
        <span className="text-sm font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
          {displayValue ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-zinc-700
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-primary-500
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:hover:scale-110
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-primary-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:shadow-lg
          [&::-moz-range-thumb]:cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #3f3f46 ${percentage}%, #3f3f46 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-zinc-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
