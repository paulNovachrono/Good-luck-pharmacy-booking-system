import Image from "next/image";

export default function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Image
      src={dark ? "/LOGO-1-DARK.svg" : "/LOGO-1.svg"}
      alt="Green Leaf Polyclinic Logo"
      width={150}
      height={40}
      priority
    />
  );
}
