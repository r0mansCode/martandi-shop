import type { SVGProps } from "react";

// Inline stroke icons (24×24). Decorative by default; pass aria-label to make one meaningful.
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Icon>
);

export const CartIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1" />
    <circle cx="17" cy="19.5" r="1" />
  </Icon>
);

export const ChevronDownIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ChevronLeftIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m15 6-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
);

export const CloseIcon =(p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const DownloadIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
  </Icon>
);

export const HourglassIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 10 0V3M7 21v-3a5 5 0 0 1 10 0v3" />
  </Icon>
);

/** Filled circle in the current colour with a white tick. */
export const CheckCircleIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path d="m7.5 12.5 3 3 6-6.5" stroke="#fff" strokeWidth={2} />
  </Icon>
);

export const StoreIcon =(p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M4 10v10h16V10M3 10l2-6h14l2 6M3 10h18M9 20v-5h6v5" />
  </Icon>
);

export const IdIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="9" cy="11" r="2" />
    <path d="M6 16c.6-1.2 1.7-2 3-2s2.4.8 3 2M14 10h4M14 13h3" />
  </Icon>
);

export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="m5 12 5 5 9-10" />
  </Icon>
);

export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: SVGProps<SVGSVGElement>) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);
