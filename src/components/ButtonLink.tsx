import type { AnchorHTMLAttributes } from 'react';

/**
 * A link that looks like the design system's `Button`, for actions that go to another page, such as
 * "Open app". The design system's `Button` is always a `<button>`; a link must stay a link, so this
 * applies the same design system classes to an `<a>`.
 */
export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: 'primary' | 'secondary' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  return <a className={['sm-btn', `sm-btn-${variant}`, `sm-btn-${size}`, className].filter(Boolean).join(' ')} {...rest} />;
}
