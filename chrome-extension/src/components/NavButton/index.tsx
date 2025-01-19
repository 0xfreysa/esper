import React from 'react';
import { ReactElement, ReactNode, MouseEventHandler } from 'react';
import classNames from 'classnames';
import ChevronRight from '../SvgIcons/ChevronRight';

export default function NavButton(props: {
  ImageIcon?: ReactNode;
  title: string;
  subtitle: string;

  onClick?: MouseEventHandler;
  className?: string;
  disabled?: boolean;
}): ReactElement {
  const { ImageIcon, title, subtitle, onClick, className, disabled } = props;
  return (
    <button
      className={classNames(
        'flex flex-row flex-nowrap items-center overflow-hidden',
        'rounded-xl px-4 py-4',
        'bg-button hover:bg-buttonHover cursor-pointer shadow-sm',
        className,
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {ImageIcon && (
        <div className="flex justify-center items-center h-8 w-8 mr-4">
          {ImageIcon}
        </div>
      )}

      <div className="flex flex-col flex-nowrap items-start mr-4 flex-1 overflow-hidden">
        <span className="text-sm text-buttonText font-medium leading-[20px]">
          {title}
        </span>
        <span className="text-xs text-buttonText truncate max-w-full">
          {subtitle}
        </span>
      </div>

      <div className="flex items-center h-5">
        <ChevronRight />
      </div>
    </button>
  );
}
