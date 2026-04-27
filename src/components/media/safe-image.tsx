import NextImage, { type ImageProps } from "next/image";

import { shouldBypassNextImageOptimization } from "@/lib/images";

export function SafeImage({
  src,
  unoptimized,
  ...props
}: ImageProps): React.ReactElement {
  return (
    <NextImage
      {...props}
      src={src}
      unoptimized={unoptimized ?? shouldBypassNextImageOptimization(src)}
    />
  );
}
