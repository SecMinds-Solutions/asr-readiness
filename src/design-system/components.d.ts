import type * as React from 'react';
/** Width in px below which SideNav and AppLayout collapse. */
export declare const SIDENAV_BREAKPOINT: 768;
export interface SideNavItem { label: string; icon?: string; href?: string; active?: boolean }
export interface LogoProps { kind?: 'full' | 'mark'; variant?: 'auto' | 'color' | 'white' | 'black'; height?: number; title?: string }
export declare function Logo(props: LogoProps): React.ReactElement | null;
export interface StripeBarProps { height?: number }
export declare function StripeBar(props: StripeBarProps): React.ReactElement | null;
export interface SlideFrameProps { title?: React.ReactNode; eyebrow?: string; footer?: string; number?: number; children?: React.ReactNode }
export declare function SlideFrame(props: SlideFrameProps): React.ReactElement | null;
export interface HeroPanelProps { title: React.ReactNode; eyebrow?: string; tone?: 'deep' | 'navy' | 'sky'; logo?: boolean; children?: React.ReactNode }
export declare function HeroPanel(props: HeroPanelProps): React.ReactElement | null;
export interface WaveDividerProps { height?: number }
export declare function WaveDivider(props: WaveDividerProps): React.ReactElement | null;
export interface PageFooterProps { tagline?: string; page?: number }
export declare function PageFooter(props: PageFooterProps): React.ReactElement | null;
export interface ContactBlockProps { heading?: string; lines?: string[]; kvk?: string; btw?: string }
export declare function ContactBlock(props: ContactBlockProps): React.ReactElement | null;
export interface NumberBadgeProps { size?: number; tone?: 'deep' | 'sky' | 'outline'; children?: React.ReactNode }
export declare function NumberBadge(props: NumberBadgeProps): React.ReactElement | null;
export interface IconProps { name: string; size?: number; label?: string }
export declare function Icon(props: IconProps): React.ReactElement | null;
export interface AvatarProps { name: string; src?: string; size?: number }
export declare function Avatar(props: AvatarProps): React.ReactElement | null;
export interface DividerProps { label?: string }
export declare function Divider(props: DividerProps): React.ReactElement | null;
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'sky' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: string; iconRight?: string; loading?: boolean };
export declare const Button: React.FC<ButtonProps>;
export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; variant?: 'primary' | 'secondary' | 'sky' | 'ghost' | 'danger'; size?: 'sm' | 'md' };
export declare const IconButton: React.FC<IconButtonProps>;
export type TextLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { external?: boolean };
export declare const TextLink: React.FC<TextLinkProps>;
export interface FieldProps { label: string; hint?: string; error?: string; required?: boolean; children: React.ReactElement }
export declare function Field(props: FieldProps): React.ReactElement | null;
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { icon?: string };
export declare const Input: React.FC<InputProps>;
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export declare const Textarea: React.FC<TextareaProps>;
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] };
export declare const Select: React.FC<SelectProps>;
export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode };
export declare const Checkbox: React.FC<CheckboxProps>;
export type RadioProps = React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode };
export declare const Radio: React.FC<RadioProps>;
export type SwitchProps = React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode };
export declare const Switch: React.FC<SwitchProps>;
export interface NavbarProps { brand?: React.ReactNode; links?: { label: string; href?: string; active?: boolean }[]; actions?: React.ReactNode }
export declare function Navbar(props: NavbarProps): React.ReactElement | null;
export interface MenuProps { label?: React.ReactNode; ariaLabel?: string; icon?: string; avatar?: string; variant?: 'primary' | 'secondary' | 'sky' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; header?: React.ReactNode; items: ({ label: React.ReactNode; icon?: string; href?: string; onSelect?: (e: any) => void; danger?: boolean; disabled?: boolean } | { heading: string } | { divider: true })[]; align?: 'start' | 'end'; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }
export declare function Menu(props: MenuProps): React.ReactElement | null;
export type SideNavProps = { items?: SideNavItem[]; groups?: { label?: string; items: SideNavItem[] }[]; label?: string; menuLabel?: string; dividers?: boolean; collapsed?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void } & Omit<React.HTMLAttributes<HTMLElement>, 'children'>;
export declare function SideNav(props: SideNavProps): React.ReactElement | null;
export type AppLayoutProps = { sidebar: React.ReactNode; children?: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>;
export declare function AppLayout(props: AppLayoutProps): React.ReactElement | null;
export interface BreadcrumbProps { items: { label: string; href?: string }[] }
export declare function Breadcrumb(props: BreadcrumbProps): React.ReactElement | null;
export interface TabsProps { tabs: { value: string; label: string; content: React.ReactNode }[]; value?: string; defaultValue?: string; onChange?: (v: string) => void }
export declare function Tabs(props: TabsProps): React.ReactElement | null;
export interface PaginationProps { page: number; pages: number; onChange?: (p: number) => void }
export declare function Pagination(props: PaginationProps): React.ReactElement | null;
export interface CardProps { title?: React.ReactNode; media?: React.ReactNode; footer?: React.ReactNode; tone?: 'deep' | 'sky'; children?: React.ReactNode }
export declare function Card(props: CardProps): React.ReactElement | null;
export interface StatProps { value: React.ReactNode; label: string; delta?: string; tone?: 'plain' | 'deep' | 'sky' }
export declare function Stat(props: StatProps): React.ReactElement | null;
export interface TableProps { columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; render?: (row: any) => React.ReactNode }[]; rows: any[]; caption?: string }
export declare function Table(props: TableProps): React.ReactElement | null;
export interface QuoteFrameProps { cite?: string; children?: React.ReactNode }
export declare function QuoteFrame(props: QuoteFrameProps): React.ReactElement | null;
export interface AccordionProps { items: { title: string; content: React.ReactNode; open?: boolean }[] }
export declare function Accordion(props: AccordionProps): React.ReactElement | null;
export interface BarChartProps { data: { label: string; value: number; series?: number }[]; max?: number; height?: number; label: string }
export declare function BarChart(props: BarChartProps): React.ReactElement | null;
export interface DonutChartProps { data: { label: string; value: number }[]; size?: number; label: string }
export declare function DonutChart(props: DonutChartProps): React.ReactElement | null;
export interface BadgeProps { tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; icon?: boolean | string; children?: React.ReactNode }
export declare function Badge(props: BadgeProps): React.ReactElement | null;
export interface AlertProps { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: string; onDismiss?: () => void; children?: React.ReactNode }
export declare function Alert(props: AlertProps): React.ReactElement | null;
export interface ToastProps { tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; action?: React.ReactNode; children?: React.ReactNode }
export declare function Toast(props: ToastProps): React.ReactElement | null;
export interface ProgressProps { value: number; label?: string }
export declare function Progress(props: ProgressProps): React.ReactElement | null;
export interface SpinnerProps { size?: number; label?: string }
export declare function Spinner(props: SpinnerProps): React.ReactElement | null;
export interface SkeletonProps { width?: number | string; height?: number | string }
export declare function Skeleton(props: SkeletonProps): React.ReactElement | null;
export interface TooltipProps { text: string; children: React.ReactNode }
export declare function Tooltip(props: TooltipProps): React.ReactElement | null;
export interface DialogProps { open: boolean; title: string; onClose?: () => void; footer?: React.ReactNode; children?: React.ReactNode }
export declare function Dialog(props: DialogProps): React.ReactElement | null;
export interface EmptyStateProps { icon?: string; title: string; action?: React.ReactNode; children?: React.ReactNode }
export declare function EmptyState(props: EmptyStateProps): React.ReactElement | null;
declare global { interface Window { SecMinds: { Logo: typeof Logo; StripeBar: typeof StripeBar; SlideFrame: typeof SlideFrame; HeroPanel: typeof HeroPanel; WaveDivider: typeof WaveDivider; PageFooter: typeof PageFooter; ContactBlock: typeof ContactBlock; NumberBadge: typeof NumberBadge; Icon: typeof Icon; Avatar: typeof Avatar; Divider: typeof Divider; Button: typeof Button; IconButton: typeof IconButton; TextLink: typeof TextLink; Field: typeof Field; Input: typeof Input; Textarea: typeof Textarea; Select: typeof Select; Checkbox: typeof Checkbox; Radio: typeof Radio; Switch: typeof Switch; Navbar: typeof Navbar; Menu: typeof Menu; SideNav: typeof SideNav; AppLayout: typeof AppLayout; Breadcrumb: typeof Breadcrumb; Tabs: typeof Tabs; Pagination: typeof Pagination; Card: typeof Card; Stat: typeof Stat; Table: typeof Table; QuoteFrame: typeof QuoteFrame; Accordion: typeof Accordion; BarChart: typeof BarChart; DonutChart: typeof DonutChart; Badge: typeof Badge; Alert: typeof Alert; Toast: typeof Toast; Progress: typeof Progress; Spinner: typeof Spinner; Skeleton: typeof Skeleton; Tooltip: typeof Tooltip; Dialog: typeof Dialog; EmptyState: typeof EmptyState; iconNames: string[]; SIDENAV_BREAKPOINT: 768 } } }
