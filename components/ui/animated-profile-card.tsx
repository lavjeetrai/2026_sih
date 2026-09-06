'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useTheme } from 'next-themes';
import * as React from 'react';
import { useRef } from 'react';

// Register useGSAP with gsap
if (typeof window !== 'undefined') {
  gsap.registerPlugin(useGSAP);
}

export interface SocialLink {
  id: string;
  url: string;
  icon: React.ReactNode;
  label: string;
}

export interface ProfileCardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The full name of the individual. */
  name: string;
  /** The location, such as city and state. */
  location: string;
  /** A short biography or description. */
  bio: string;
  /** The source URL for the avatar image. */
  avatarSrc: string;
  /** Fallback text to display in the avatar (usually initials). */
  avatarFallback: string;
  /**
   * The color variant of the card content. Use 'on-accent' for text
   * that needs to be readable on a background matching the accent color.
   * @default 'default'
   */
  variant?: 'default' | 'on-accent';
  /** An array of social media links to display in the footer. */
  socials?: SocialLink[];
  /**
   * Controls the visibility of the avatar. If `false`, the avatar will be
   * invisible but still occupy space to prevent layout shifts.
   * @default true
   */
  showAvatar?: boolean;
  /** Custom Tailwind classes for the main title element. */
  titleClassName?: string;
  /** Optional inline styles for the main title element. */
  titleStyle?: React.CSSProperties;
  /** Optional inline styles for the root Card element. */
  cardStyle?: React.CSSProperties;
  /** Custom Tailwind classes for the location description text. */
  descriptionClassName?: string;
  /** Custom Tailwind classes for the main biography paragraph. */
  bioClassName?: string;
  /** Custom Tailwind classes for the footer container. */
  footerClassName?: string;
}

/**
 * A presentational component that displays the content of a user profile card.
 * It is designed to be composed within other components, such as an animation container.
 */
export const ProfileCardContent = React.forwardRef<
  HTMLDivElement,
  ProfileCardContentProps
>(
  (
    {
      className,
      name,
      location,
      bio,
      avatarSrc,
      avatarFallback,
      variant = 'default',
      socials = [],
      showAvatar = true,
      titleClassName,
      titleStyle,
      cardStyle,
      descriptionClassName,
      bioClassName,
      footerClassName,
      ...props
    },
    ref
  ) => {
    const isOnAccent = variant === 'on-accent';

    return (
      <Card
        ref={ref}
        className={cn(
          'w-full h-full p-8 flex flex-col rounded-3xl border-0',
          isOnAccent
            ? 'text-[var(--on-accent-foreground)]'
            : 'bg-card text-card-foreground',
          className
        )}
        style={cardStyle}
        {...props}
      >
        <CardHeader className='p-0'>
          <div className={cn('flex-shrink-0', !showAvatar && 'invisible')}>
            <Avatar
              className='h-16 w-16 ring-2 ring-offset-4 ring-offset-card'
              style={
                {
                  '--tw-ring-color': 'var(--accent-color)',
                } as React.CSSProperties
              }
            >
              <AvatarImage src={avatarSrc} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
          </div>
          <CardDescription
            className={cn(
              'pt-6 text-left',
              !isOnAccent && 'text-muted-foreground',
              descriptionClassName
            )}
            style={
              isOnAccent ? { color: 'var(--on-accent-muted-foreground)' } : {}
            }
          >
            {location}
          </CardDescription>
          <CardTitle
            className={cn('text-2xl sm:text-3xl text-left', titleClassName)}
            style={{
              ...(isOnAccent ? { color: 'var(--on-accent-foreground)' } : {}),
              ...titleStyle,
            }}
          >
            {name}
          </CardTitle>
        </CardHeader>

        <CardContent className='p-0 flex-grow mt-4 sm:mt-6'>
          <p
            className={cn(
              'text-sm sm:text-base leading-relaxed text-left',
              !isOnAccent && 'text-foreground/80',
              bioClassName
            )}
            style={isOnAccent ? { opacity: 0.9 } : {}}
          >
            {bio}
          </p>
        </CardContent>

        {socials.length > 0 && (
          <CardFooter className={cn('p-0 mt-4 sm:mt-6', footerClassName)}>
            <div
              className={cn(
                'flex items-center gap-4',
                !isOnAccent && 'text-muted-foreground'
              )}
              style={
                isOnAccent ? { color: 'var(--on-accent-muted-foreground)' } : {}
              }
            >
              {socials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  aria-label={social.label}
                  target={social.url.startsWith('http') ? '_blank' : undefined}
                  rel={social.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  onClick={(e) => {
                    if (social.url === '#') {
                      e.preventDefault();
                    }
                  }}
                  className={cn(
                    'transition-opacity',
                    isOnAccent ? 'hover:opacity-75' : 'hover:text-foreground'
                  )}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </CardFooter>
        )}
      </Card>
    );
  }
);
ProfileCardContent.displayName = 'ProfileCardContent';

export interface AnimatedProfileCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The React node to display as the base layer of the card. */
  baseCard: React.ReactNode;
  /** The React node to display as the overlay layer, revealed on hover. */
  overlayCard: React.ReactNode;
  /**
   * The accent color used for the border and avatar ring.
   * Accepts any valid CSS color value.
   */
  accentColor?: string;
  /**
   * The color for primary text when on the accent background.
   * @default '#ffffff'
   */
  onAccentForegroundColor?: string;
  /**
   * The color for secondary/muted text when on the accent background.
   * @default 'rgba(255, 255, 255, 0.8)'
   */
  onAccentMutedForegroundColor?: string;
}

/**
 * A container component that creates a circular reveal animation on hover.
 * It composes two child components, a `baseCard` and an `overlayCard`,
 * to create the effect.
 */
export const AnimatedProfileCard = React.forwardRef<
  HTMLDivElement,
  AnimatedProfileCardProps
>(
  (
    {
      className,
      accentColor = 'var(--primary)',
      onAccentForegroundColor = '#ffffff',
      onAccentMutedForegroundColor = 'rgba(255, 255, 255, 0.8)',
      baseCard,
      overlayCard,
      ...props
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    
    // Safely retrieve theme or default to light
    let resolvedTheme = 'light';
    try {
      const themeContext = useTheme();
      if (themeContext?.resolvedTheme) {
        resolvedTheme = themeContext.resolvedTheme;
      }
    } catch {
      resolvedTheme = 'light';
    }
    const overlayThemeClass = resolvedTheme === 'dark' ? 'light' : 'dark';

    const setContainerRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref]
    );

    const initialClipPath = 'circle(40px at 64px 64px)';
    const hoverClipPath = 'circle(150% at 64px 64px)';

    useGSAP(
      () => {
        if (overlayRef.current) {
          gsap.set(overlayRef.current, { clipPath: initialClipPath });
        }
      },
      { scope: containerRef }
    );

    const handleMouseEnter = () => {
      if (overlayRef.current) {
        gsap.killTweensOf(overlayRef.current);
        gsap.to(overlayRef.current, {
          clipPath: hoverClipPath,
          duration: 0.7,
          ease: 'expo.inOut',
        });
      }
    };

    const handleMouseLeave = () => {
      if (overlayRef.current) {
        gsap.killTweensOf(overlayRef.current);
        gsap.to(overlayRef.current, {
          clipPath: initialClipPath,
          duration: 1.2,
          ease: 'expo.out(1, 1)',
        });
      }
    };

    return (
      <div
        ref={setContainerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={
          {
            '--accent-color': accentColor,
            '--on-accent-foreground': onAccentForegroundColor,
            '--on-accent-muted-foreground': onAccentMutedForegroundColor,
            borderColor: 'var(--accent-color)',
          } as React.CSSProperties
        }
        className={cn(
          'relative h-fit w-full max-w-[350px] overflow-hidden rounded-3xl border-2',
          className
        )}
        {...props}
      >
        <div className='h-full w-full'>{baseCard}</div>
        <div
          ref={overlayRef}
          className={cn('absolute inset-0 h-full w-full', overlayThemeClass)}
        >
          {overlayCard}
        </div>
      </div>
    );
  }
);
AnimatedProfileCard.displayName = 'AnimatedProfileCard';

export interface CompactProfileCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  badgeTitle: string;
  badgeId?: string;
  badgeIcon?: React.ReactNode;
  name: string;
  role: string;
  location?: string;
  bio?: string;
  avatarSrc: string;
  avatarFallback: string;
  socials?: SocialLink[];
  themeVariant?: 'emerald' | 'blue' | 'neutral';
}

/**
 * A compact, symmetrical profile card matching the OIL India incident dossier layout.
 * Clean, static presentation without color-inverting hover effects.
 */
export const CompactProfileCard = React.forwardRef<
  HTMLDivElement,
  CompactProfileCardProps
>(
  (
    {
      className,
      badgeTitle,
      badgeId,
      badgeIcon,
      name,
      role,
      location,
      bio,
      avatarSrc,
      avatarFallback,
      socials = [],
      themeVariant = 'neutral',
      ...props
    },
    ref
  ) => {
    const isEmerald = themeVariant === 'emerald';
    const isBlue = themeVariant === 'blue';

    return (
      <div
        ref={ref}
        className={cn(
          'w-full rounded-xl border p-3.5 transition-all duration-200 shadow-2xs space-y-2.5',
          isEmerald
            ? 'bg-neutral-50/90 border-neutral-200/90 hover:border-emerald-300'
            : isBlue
            ? 'bg-blue-50/30 border-blue-200/70 hover:border-blue-300'
            : 'bg-white border-neutral-200 hover:border-neutral-300',
          className
        )}
        {...props}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-xs font-bold uppercase tracking-wider flex items-center gap-1.5',
              isBlue
                ? 'text-blue-900'
                : isEmerald
                ? 'text-neutral-700'
                : 'text-neutral-500'
            )}
          >
            {badgeIcon}
            {badgeTitle}
          </span>
          {badgeId && (
            <span
              className={cn(
                'text-[11px] font-semibold px-2 py-0.5 rounded border font-mono',
                isEmerald
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : isBlue
                  ? 'text-blue-700 bg-blue-100/70 border-blue-300/80'
                  : 'text-neutral-600 bg-neutral-100 border-neutral-200'
              )}
            >
              {badgeId}
            </span>
          )}
        </div>

        {/* Profile Info Row: Avatar + Name/Role/Location */}
        <div className="flex items-center gap-3">
          <Avatar
            className={cn(
              'h-11 w-11 shrink-0 rounded-full border shadow-xs',
              isEmerald
                ? 'border-emerald-500/30'
                : isBlue
                ? 'border-blue-500/30'
                : 'border-neutral-200'
            )}
          >
            <AvatarImage src={avatarSrc} alt={name} className="object-cover" />
            <AvatarFallback className="font-bold text-xs bg-neutral-200 text-neutral-800">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col min-w-0 flex-1">
            <h4 className="text-sm font-bold text-neutral-900 leading-tight truncate">
              {name}
            </h4>
            <p className="text-xs text-neutral-600 font-medium truncate mt-0.5">
              {role}
            </p>
            {location && (
              <p className="text-[11px] text-neutral-500 font-mono truncate mt-0.5">
                {location}
              </p>
            )}
          </div>
        </div>

        {/* Bio / Responsibility Note */}
        {bio && (
          <p
            className={cn(
              'text-xs leading-relaxed p-2.5 rounded-lg border',
              isBlue
                ? 'bg-blue-50/50 border-blue-100/80 text-neutral-700'
                : isEmerald
                ? 'bg-neutral-100/70 border-neutral-200/60 text-neutral-700'
                : 'bg-neutral-50 border-neutral-200/60 text-neutral-600'
            )}
          >
            {bio}
          </p>
        )}

        {/* Social / Tactical Channels Footer */}
        {socials.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-200/60">
            {socials.map((social) => (
              <a
                key={social.id}
                href={social.url}
                aria-label={social.label}
                title={social.label}
                target={social.url.startsWith('http') ? '_blank' : undefined}
                rel={
                  social.url.startsWith('http')
                    ? 'noopener noreferrer'
                    : undefined
                }
                onClick={(e) => {
                  if (social.url === '#') {
                    e.preventDefault();
                  }
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors shadow-2xs',
                  isBlue
                    ? 'bg-white hover:bg-blue-50/80 text-blue-900 border-blue-200/80 hover:border-blue-300'
                    : isEmerald
                    ? 'bg-white hover:bg-emerald-50/80 text-emerald-900 border-neutral-200/80 hover:border-emerald-300'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                )}
              >
                {social.icon}
                <span className="truncate max-w-[150px]">{social.label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }
);
CompactProfileCard.displayName = 'CompactProfileCard';
