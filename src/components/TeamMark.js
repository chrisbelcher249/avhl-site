import Image from "next/image";

export default function TeamMark({ team, size = "md", framed = true, priority = false }) {
  const sizes = {
    sm: "h-14 w-14",
    md: "h-20 w-20",
    lg: "h-32 w-32 md:h-40 md:w-40",
    xl: "h-40 w-40 md:h-52 md:w-52",
  };

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center ${sizes[size] || sizes.md} ${
        framed ? "rounded-[2rem] border border-white/15 bg-white/95 p-3 shadow-2xl" : ""
      }`}
    >
      <Image
        src={team.assets.logo}
        alt={`${team.name} logo`}
        width={700}
        height={700}
        className="h-full w-full object-contain"
        priority={priority}
      />
    </div>
  );
}
