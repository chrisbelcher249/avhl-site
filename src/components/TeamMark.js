function textColor(hex = "#000B36") {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#FFFFFF";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.66 ? "#000B36" : "#FFFFFF";
}

export default function TeamMark({ team, size = "md" }) {
  const sizes = {
    sm: "h-14 w-14 rounded-2xl text-lg",
    md: "h-20 w-20 rounded-3xl text-2xl",
    lg: "h-32 w-32 rounded-[2rem] text-4xl md:h-40 md:w-40 md:text-5xl",
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border-4 font-black tracking-tight shadow-lg ${sizes[size] || sizes.md}`}
      style={{
        backgroundColor: team.colors.primary,
        borderColor: team.colors.secondary,
        color: textColor(team.colors.primary),
      }}
      aria-label={`${team.name} team mark`}
    >
      <span className="relative z-10">{team.abbreviation}</span>
      <span
        className="absolute -bottom-5 -right-4 h-16 w-16 rotate-12 rounded-full opacity-55 md:h-24 md:w-24"
        style={{ backgroundColor: team.colors.tertiary }}
      />
    </div>
  );
}
